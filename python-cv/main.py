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

import face_engine
import liveness as lv
import cv2
import base64
import numpy as np

logger = logging.getLogger("main")
logging.basicConfig(level=logging.INFO)

NODE_SERVER_URL = os.getenv("NODE_SERVER_URL", "http://localhost:5000")


# ---------------------------------------------------------------------------
# Lifespan: build encoding cache on startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"🔗 Connecting to Node.js backend at: {NODE_SERVER_URL}")
    face_engine.start(NODE_SERVER_URL)
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
    face_engine.force_refresh(NODE_SERVER_URL)
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

    # Face recognition
    result = face_engine.recognize_face(req.image)

    return RecognizeResponse(
        matched=result.get("matched", False),
        studentId=result.get("studentId"),
        studentName=result.get("studentName"),
        confidence=result.get("confidence"),
        live=True,
        liveness_reason=liveness_result["reason"],
        error=result.get("error"),
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
