"""
face_engine.py — Mock face-recognition engine.

HOW IT WORKS (Mock mode — no C++ build tools required):
  - On startup it fetches all students from the Node backend.
  - It stores their _id, name and entryNumber in memory.
  - recognize_face() returns the most-recently registered student whenever
    a face is detected (real dlib-based matching would go here).
  - A watchdog thread retries the cache build every 30 s if the initial
    fetch failed (e.g. backend was not yet ready).
  - A periodic refresh thread re-fetches the full list every 5 minutes so
    newly registered students appear automatically.
"""

import time
import threading
import logging
import requests
import os

logger = logging.getLogger("face_engine")
logging.basicConfig(level=logging.INFO)

_lock = threading.Lock()
_known_student_ids    = []
_known_student_names  = []
_known_entry_numbers  = []   # stored for richer response payloads

INTERNAL_TOKEN = os.getenv("INTERNAL_API_KEY", "internal_secret_token")

# ── Cache builder ─────────────────────────────────────────────────────────────

def _build_cache(node_api_url: str) -> bool:
    """
    Fetch the student list from the Node.js backend and store it locally.
    Returns True on success, False on failure.
    Strict field names: uses 'entryNumber' and 'faceImageUrl' as per the Student model.
    """
    try:
        headers = {"x-internal-token": INTERNAL_TOKEN}
        url     = f"{node_api_url}/api/students/list"
        logger.info(f"Fetching student list from {url} …")

        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        students = resp.json()

    except Exception as e:
        logger.error(f"Could not fetch student list: {e}")
        return False

    new_ids    = []
    new_names  = []
    new_entries = []

    for student in students:
        # --- strict schema fields ---
        sid          = str(student.get("_id") or student.get("id") or "")
        name         = student.get("name", "Unknown")
        entry_number = student.get("entryNumber", "")
        face_url     = student.get("faceImageUrl", "")   # available for real face-encoding use

        if not sid:
            continue

        new_ids.append(sid)
        new_names.append(name)
        new_entries.append(entry_number)

        # In a production build with dlib / face_recognition:
        #   encoding = encode_from_url(face_url)   ← download & encode
        #   _known_encodings.append(encoding)

    with _lock:
        _known_student_ids.clear()
        _known_student_names.clear()
        _known_entry_numbers.clear()

        _known_student_ids.extend(new_ids)
        _known_student_names.extend(new_names)
        _known_entry_numbers.extend(new_entries)

    logger.info(f"✅ Cache rebuilt — {len(new_ids)} student(s) loaded.")
    return True


# ── Background threads ────────────────────────────────────────────────────────

def _refresh_loop(node_api_url: str):
    """Re-fetch full student list every 5 minutes."""
    while True:
        time.sleep(300)
        _build_cache(node_api_url)


def _watchdog_loop(node_api_url: str):
    """
    If the initial cache build failed (backend not ready yet), retry every 30 s
    until at least one student is loaded — then stop.
    """
    while True:
        time.sleep(30)
        with _lock:
            is_empty = len(_known_student_ids) == 0
        if is_empty:
            logger.info("Watchdog: cache still empty — retrying sync with backend …")
            _build_cache(node_api_url)
        else:
            logger.info("Watchdog: cache populated, exiting watchdog loop.")
            break


# ── Public API ────────────────────────────────────────────────────────────────

def start(node_api_url: str):
    logger.info("Starting face engine …")
    _build_cache(node_api_url)

    # Periodic full refresh
    threading.Thread(target=_refresh_loop,  args=(node_api_url,), daemon=True).start()

    # Self-healing: retry if startup fetch failed
    threading.Thread(target=_watchdog_loop, args=(node_api_url,), daemon=True).start()


def force_refresh(node_api_url: str) -> bool:
    """Called by POST /refresh — allows admin to trigger a manual re-sync."""
    return _build_cache(node_api_url)


def recognize_face(b64_image: str) -> dict:
    """
    Mock recognition — returns the most recently registered student if any exist.

    Replace this function body with real dlib / face_recognition logic once
    C++ build tools are available. The interface (return dict) stays the same.
    """
    with _lock:
        if not _known_student_ids:
            return {
                "matched": False,
                "error":   "No students enrolled yet — try clicking 'Sync CV Cache' in the Admin Dashboard",
            }

        # Mock: identify as the most recently added student
        time.sleep(0.25)   # simulate processing latency

        idx          = -1   # last / most recent
        student_id   = _known_student_ids[idx]
        student_name = _known_student_names[idx]
        entry_number = _known_entry_numbers[idx]

    return {
        "matched":      True,
        "studentId":    student_id,
        "studentName":  student_name,
        "entryNumber":  entry_number,
        "confidence":   0.97,
        "face_location": [0, 0, 100, 100],
    }
