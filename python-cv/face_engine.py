"""
face_engine.py — Mock implementation for testing the UI flow without C++ Build Tools.
"""
import time
import threading
import logging
import requests

logger = logging.getLogger("face_engine")
logging.basicConfig(level=logging.INFO)

_lock = threading.Lock()
_known_student_ids = []
_known_student_names = []

def _build_cache(node_api_url: str):
    try:
        resp = requests.get(f"{node_api_url}/api/students/list", timeout=15)
        resp.raise_for_status()
        students = resp.json()
    except Exception as e:
        logger.error(f"Could not fetch student list: {e}")
        return

    new_ids = []
    new_names = []

    for student in students:
        sid = student.get("_id") or student.get("id")
        name = student.get("name", "Unknown")
        if sid:
            new_ids.append(str(sid))
            new_names.append(name)

    with _lock:
        _known_student_ids.clear()
        _known_student_names.clear()
        _known_student_ids.extend(new_ids)
        _known_student_names.extend(new_names)

    logger.info(f"Mock Cache rebuilt with {len(new_ids)} student(s).")

def _refresh_loop(node_api_url: str):
    while True:
        time.sleep(300)
        _build_cache(node_api_url)

def start(node_api_url: str):
    logger.info("Starting mock face engine...")
    _build_cache(node_api_url)
    threading.Thread(target=_refresh_loop, args=(node_api_url,), daemon=True).start()

def force_refresh(node_api_url: str):
    _build_cache(node_api_url)

def recognize_face(b64_image: str) -> dict:
    """Mock recognition: Always returns the first student in the DB if any exist."""
    with _lock:
        if not _known_student_ids:
            return {"matched": False, "error": "No students enrolled yet"}
        
        # Simulate local network latency
        time.sleep(0.3)
        
        # Pick the most recently registered student (or just the first one)
        student_id = _known_student_ids[-1]
        student_name = _known_student_names[-1]

        return {
            "matched": True,
            "studentId": student_id,
            "studentName": student_name,
            "confidence": 0.99,
            "face_location": [0, 0, 100, 100],
        }

