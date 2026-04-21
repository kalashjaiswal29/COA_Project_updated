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
from pymongo import MongoClient
from insightface.app import FaceAnalysis

logger = logging.getLogger("main")

# Initialize InsightFace (buffalo_sc is lightweight ~15MB)
face_app = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])
face_app.prepare(ctx_id=-1, det_size=(640, 640))
logging.basicConfig(level=logging.INFO)

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    logger.warning("MONGO_URI is missing, falling back to localhost.")
    MONGO_URI = "mongodb://localhost:27017/attendance_db"

# Global Lists Management
known_face_encodings = []
known_face_names = []
known_face_ids = []
frame_counter = 0

# Added serverSelectionTimeoutMS so it fails fast rather than hanging on startup
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
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
                
            # Image Resizing (50%)
            small_image = cv2.resize(image, (0, 0), fx=0.5, fy=0.5)
            # Convert BGR to RGB as requested for color check
            rgb_image = cv2.cvtColor(small_image, cv2.COLOR_BGR2RGB)
            
            try:
                faces = face_app.get(rgb_image)
                if faces and len(faces) > 0:
                    primary_face = max(faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]))
                    embedding = primary_face.normed_embedding
                    
                    # Ensure they are appended tightly
                    known_face_encodings.append(embedding)
                    known_face_names.append(student_name)
                    known_face_ids.append(student_id)
            except Exception as e:
                logger.error(f"InsightFace encoding failed for {student_name}: {e}")
                
            # Free RAM explicitly per student
            del image_data, image, small_image, rgb_image
            if 'faces' in locals():
                del faces
            if 'primary_face' in locals():
                del primary_face
            
        except Exception as e:
            logger.error(f"Failed to load image for {student_name}: {e}")
            
    gc.collect()
    logger.info(f"Loaded {len(known_face_encodings)} student faces successfully.")

# ---------------------------------------------------------------------------
# Startup logic
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Attendance CV Microservice",
    version="1.0.0",
)

@app.on_event("startup")
async def startup_event():
    logger.info("🔗 Loading faces from MongoDB on startup")
    try:
        load_faces()
    except Exception as e:
        logger.error(f"Startup error: Could not load faces. DB might be unreachable: {e}")

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
    1. Check frame skip logic
    2. Decode
    3. Run liveness check
    4. Run face recognition
    5. Return result
    """
    global frame_counter
    frame_counter += 1
    
    # Skip Frame Logic: only process every 3rd frame
    if frame_counter % 3 != 0:
        return RecognizeResponse(
            matched=False,
            live=True,
            error="Frame skipped for CPU optimization"
        )
        
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

    # Face recognition: scale frame to 50% (0.5)
    small_frame = cv2.resize(img_bgr, (0, 0), fx=0.5, fy=0.5)
    # Convert BGR to RGB as requested for color check
    rgb_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
    
    # Save debug frame (save as BGR so it looks normal in standard image viewers)
    cv2.imwrite("debug_frame.jpg", cv2.cvtColor(rgb_frame, cv2.COLOR_RGB2BGR))
    
    # Process face with InsightFace
    try:
        faces = face_app.get(rgb_frame)
    except Exception as e:
        # No face detected or processing error
        del arr, img_bgr, small_frame, rgb_frame
        gc.collect()
        return RecognizeResponse(
            matched=False,
            live=True,
            liveness_reason=liveness_result["reason"],
            error="Processing error"
        )
    
    if not faces or len(faces) == 0:
        del arr, img_bgr, small_frame, rgb_frame, faces
        gc.collect()
        return RecognizeResponse(
            matched=False,
            live=True,
            liveness_reason=liveness_result["reason"],
            error="No face detected"
        )
        
    # Process only the primary face to save CPU/RAM
    primary_face = max(faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]))
    face_encoding_to_check = primary_face.normed_embedding
    
    matched = False
    best_match_index = -1
    confidence = 0.0
    
    if len(known_face_encodings) > 0:
        # Calculate Cosine Similarities
        known_encodings_array = np.array(known_face_encodings)
        similarities = np.dot(known_encodings_array, face_encoding_to_check)
        best_match_index = np.argmax(similarities)
        best_score = float(similarities[best_match_index])
        
        # Debug logging
        logger.info(f"🔍 Best match score: {best_score:.4f} for {known_face_names[best_match_index]}")
        
        # InsightFace cosine similarity threshold (lenient threshold for demo)
        if best_score >= 0.55:
            matched = True
            confidence = best_score
            
        del known_encodings_array, similarities

    # Cleanup memory
    del arr, img_bgr, small_frame, rgb_frame, faces, primary_face, face_encoding_to_check
    gc.collect()
            
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

    logger.info("🚀 Starting CV service on 0.0.0.0:10000")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=10000,
        log_level="info",
    )
