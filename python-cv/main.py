import os
import logging
import cv2
import base64
import numpy as np
import urllib.request
import gc

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient

import face_recognition
import liveness as lv

logger = logging.getLogger("main")
logging.basicConfig(level=logging.INFO)

# 1. Database Connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/attendance_db")
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
try:
    db = client.get_default_database()
except:
    db = client["attendance_db"]

# Global Lists
known_face_encodings = []
known_face_names = []
known_face_ids = []
frame_counter = 0

def get_face_embedding(image_bgr):
    """Gets face embedding using dlib-based face_recognition."""
    rgb_image = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    face_locations = face_recognition.face_locations(rgb_image)
    if not face_locations:
        return None
    face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
    if len(face_encodings) > 0:
        return face_encodings[0]
    return None

def load_faces():
    global known_face_encodings, known_face_names, known_face_ids
    
    known_face_encodings.clear()
    known_face_names.clear()
    known_face_ids.clear()
    
    logger.info("Loading student faces from MongoDB...")
    
    try:
        students = db.students.find({})
        for student in students:
            student_id = str(student.get("_id"))
            student_name = student.get("name", "Unknown")
            image_url = student.get("faceImageUrl")
            
            if not image_url:
                continue
                
            try:
                req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
                resp = urllib.request.urlopen(req)
                image_data = np.asarray(bytearray(resp.read()), dtype="uint8")
                image = cv2.imdecode(image_data, cv2.IMREAD_COLOR)
                
                if image is None:
                    continue
                    
                # Downscale to speed up local processing
                image = cv2.resize(image, (0, 0), fx=0.5, fy=0.5)
                
                embedding = get_face_embedding(image)
                if embedding is not None:
                    known_face_encodings.append(embedding)
                    known_face_names.append(student_name)
                    known_face_ids.append(student_id)
            except Exception as e:
                logger.error(f"Failed to load image for {student_name}: {e}")
    except Exception as e:
        logger.error(f"MongoDB Fetch Failed: {e}")
        
    gc.collect()
    logger.info(f"Loaded {len(known_face_encodings)} student faces successfully.")

app = FastAPI(title="Attendance CV Microservice", version="1.0.0")

@app.on_event("startup")
async def startup_event():
    load_faces()

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class RecognizeRequest(BaseModel):
    image: str
    classId: str

class RecognizeResponse(BaseModel):
    matched: bool
    studentId: str | None = None
    studentName: str | None = None
    confidence: float | None = None
    live: bool = True
    liveness_reason: str = ""
    error: str | None = None

@app.post("/recognize", response_model=RecognizeResponse)
async def recognize(req: RecognizeRequest):
    global frame_counter
    frame_counter += 1
    
    if frame_counter % 3 != 0:
        return RecognizeResponse(matched=False, live=True, error="Frame skipped")
        
    try:
        b64 = req.image.split(",", 1)[1] if "," in req.image else req.image
        arr = np.frombuffer(base64.b64decode(b64), dtype=np.uint8)
        img_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise ValueError()
    except:
        raise HTTPException(status_code=400, detail="Invalid image")

    liveness_result = lv.is_live(img_bgr)
    if not liveness_result["live"]:
        return RecognizeResponse(
            matched=False, live=False, liveness_reason=liveness_result["reason"], error="Liveness failed"
        )

    # Downscale for faster face recognition locally
    small_frame = cv2.resize(img_bgr, (0, 0), fx=0.5, fy=0.5)
    face_encoding = get_face_embedding(small_frame)
    
    if face_encoding is None:
        return RecognizeResponse(matched=False, live=True, error="No face detected")
        
    matched = False
    best_match_index = -1
    confidence = 0.0
    
    if len(known_face_encodings) > 0:
        face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
        best_match_index = np.argmin(face_distances)
        best_distance = face_distances[best_match_index]
        
        logger.info(f"🔍 Best match distance: {best_distance:.4f} for {known_face_names[best_match_index]}")
        
        # dlib face_distance sweet spot is typically < 0.6
        if best_distance <= 0.6:
            matched = True
            confidence = max(0.0, 1.0 - best_distance)
            
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
            error="Face not recognized"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=5000, log_level="info")
