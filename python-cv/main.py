"""
main.py — FastAPI entry point for the Computer Vision microservice.

Endpoints:
  POST /recognize   → accept base64 frame, run face recognition + liveness
  POST /refresh     → force cache rebuild (called after new student registers)
  GET  /health      → liveness probe
"""

import os
import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import liveness as lv
import cv2
import base64
import numpy as np
import gc

import urllib.request
import face_recognition
from pymongo import MongoClient

logger = logging.getLogger("main")
logging.basicConfig(level=logging.INFO)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/attendance_db")

# Global Lists Management
known_face_encodings = []
known_face_names = []
known_face_ids = []

client = MongoClient(MONGO_URI)
try:
    db = client.get_default_database()
except:
    db = client["attendance_db"]


def load_faces():
    global known_face_encodings, known_face_names, known_face_ids
    
    # Refresh Logic: ensure lists are cleared once at the start
    known_face_encodings.clear()
    known_face_names.clear()
    known_face_ids.clear()
    
    logger.info("Loading student faces from MongoDB...")
    
    students = db.students.find({})
    
    for student in students:
        student_id = str(student.get("_id"))
        student_name = student.get("name", "Unknown")
        image_url = student.get("faceImageUrl")
        
        if not image_url:
            continue
            
        # Error Handling: Add try-except block inside loading loop
        try:
            req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
            resp = urllib.request.urlopen(req)
            image_data = np.asarray(bytearray(resp.read()), dtype="uint8")
            image = cv2.imdecode(image_data, cv2.IMREAD_COLOR)
            
            if image is None:
                continue
                
            # Image Resizing (25%)
            small_image = cv2.resize(image, (0, 0), fx=0.25, fy=0.25)
            rgb_image = cv2.cvtColor(small_image, cv2.COLOR_BGR2RGB)
            
            encodings = face_recognition.face_encodings(rgb_image)
            
            if encodings:
                # Ensure they are appended to, not reset, inside the loop
                known_face_encodings.append(encodings[0])
                known_face_names.append(student_name)
                known_face_ids.append(student_id)
                
            # Free RAM explicitly per student
            del image_data, image, small_image, rgb_image, encodings
            
        except Exception as e:
            logger.error(f"Failed to load image for {student_name}: {e}")
            
    gc.collect()
    logger.info(f"Loaded {len(known_face_encodings)} student faces successfully.")

# ---------------------------------------------------------------------------
# Lifespan: build encoding cache on startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🔗 Loading faces from MongoDB on startup")
    load_faces()
    yield
    logger.info("🛑 CV service shutting down.")


app = FastAPI(
    title="Attendance CV Microservice",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class RecognizeRequest(BaseModel):
    image: str          # base64-encoded JPEG/PNG
    classId: str        # used for context/logging only


class RecognizeResponse(BaseModel):
    matched: bool
    studentId: str | None = None
    studentName: str | None = None
    confidence: float | None = None
    live: bool = True
    liveness_reason: str = ""
    error: str | None = None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/")
async def root():
    return {"status": "Online", "message": "AttendAI Python CV Service is running ✅"}

@app.get("/health")
async def health():
    return {"status": "ok", "service": "python-cv"}


@app.post("/refresh")
async def refresh_cache():
    """Force reload of face encoding cache."""
    load_faces()
    return {"status": "cache refreshed"}


@app.post("/recognize", response_model=RecognizeResponse)
async def recognize(req: RecognizeRequest):
    """
    Accept a base64 image frame.
    1. Decode
    2. Run liveness check
    3. Run face recognition
    4. Return result
    """
    # Decode to OpenCV for liveness
    try:
        b64 = req.image
        if "," in b64:
            b64 = b64.split(",", 1)[1]
        data = base64.b64decode(b64)
        arr = np.frombuffer(data, dtype=np.uint8)
        img_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise ValueError("cv2.imdecode returned None")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")

    # Quick liveness check (no face_rect at this stage — full-frame check)
    liveness_result = lv.is_live(img_bgr)
    if not liveness_result["live"]:
        return RecognizeResponse(
            matched=False,
            live=False,
            liveness_reason=liveness_result["reason"],
            error="Liveness check failed — possible spoofing attempt",
        )

    # Face recognition: scale frame to 25% (0.25)
    small_frame = cv2.resize(img_bgr, (0, 0), fx=0.25, fy=0.25)
    rgb_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
    
    # Speed Fix: Use 'hog' model
    face_locations = face_recognition.face_locations(rgb_frame, model="hog")
    if not face_locations:
        return RecognizeResponse(
            matched=False,
            live=True,
            liveness_reason=liveness_result["reason"],
            error="No face detected"
        )
        
    # Process only the primary face to save CPU/RAM
    if len(face_locations) > 1:
        # Calculate area for each (top, right, bottom, left)
        face_locations = [max(face_locations, key=lambda f: (f[2] - f[0]) * (f[1] - f[3]))]
        
    face_encodings_in_frame = face_recognition.face_encodings(rgb_frame, face_locations)
    
    matched = False
    best_match_index = -1
    confidence = 0.0
    
    if len(known_face_encodings) > 0 and len(face_encodings_in_frame) > 0:
        face_encoding_to_check = face_encodings_in_frame[0]
        
        # Best Match Selection: use np.argmin(face_distances)
        face_distances = face_recognition.face_distance(known_face_encodings, face_encoding_to_check)
        best_match_index = np.argmin(face_distances)
        
        # Sweet spot threshold
        if face_distances[best_match_index] < 0.55:
            matched = True
            confidence = 1.0 - face_distances[best_match_index]
            
    if matched:
        return RecognizeResponse(
            matched=True,
            studentId=known_face_ids[best_match_index],
            studentName=known_face_names[best_match_index],
            confidence=confidence,
            live=True,
            liveness_reason=liveness_result["reason"]
        )
    else:
        return RecognizeResponse(
            matched=False,
            live=True,
            liveness_reason=liveness_result["reason"],
            error="Face not recognized or no confident match"
        )


# ---------------------------------------------------------------------------
# Entrypoint — Render injects PORT via environment variable at runtime
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    # Render sets PORT dynamically. We MUST bind to 0.0.0.0 (not 127.0.0.1)
    # otherwise Render's load balancer cannot reach the service.
    port = int(os.getenv("PORT", 8000))
    logger.info(f"🚀 Starting CV service on 0.0.0.0:{port}")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
    )
