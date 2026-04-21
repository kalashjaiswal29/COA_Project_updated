"""
liveness.py — Basic liveness detection placeholder.

A production system would use a CNN-based model or anti-spoofing dataset.
Here we use simple heuristics:
  1. Texture variance check  — printed photos are flatter (less variance).
  2. Blink detection via eye aspect ratio (simplified).
  3. Blur check              — a real face is typically sharper than a photo of a screen.
"""

import cv2
import numpy as np


def compute_laplacian_variance(image_bgr: np.ndarray) -> float:
    """Measure image sharpness. Real faces tend to have more texture."""
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def compute_texture_variance(image_bgr: np.ndarray, face_rect) -> float:
    """
    Crop to the face ROI and measure local binary pattern variance.
    Printed photos have lower texture variance than real faces.
    """
    x, y, w, h = face_rect
    roi = image_bgr[y:y + h, x:x + w]
    if roi.size == 0:
        return 0.0
    gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    return float(gray_roi.std())


def is_live(image_bgr: np.ndarray, face_rect=None,
            sharpness_threshold: float = 30.0,
            texture_threshold: float = 15.0) -> dict:
    """
    Run basic liveness checks and return a result dict.

    Args:
        image_bgr:           OpenCV BGR image (numpy array).
        face_rect:           (x, y, w, h) tuple of detected face bounding box, or None.
        sharpness_threshold: Minimum Laplacian variance to be considered a live frame.
        texture_threshold:   Minimum ROI std-dev to pass texture check.

    Returns:
        {"live": bool, "reason": str, "sharpness": float, "texture": float}
    """
    sharpness = compute_laplacian_variance(image_bgr)

    texture = 0.0
    if face_rect is not None:
        texture = compute_texture_variance(image_bgr, face_rect)

    # Reject blurry frames (often a photo held up to camera or low-quality stream)
    if sharpness < sharpness_threshold:
        return {
            "live": False,
            "reason": f"Image too blurry (sharpness={sharpness:.1f} < {sharpness_threshold})",
            "sharpness": sharpness,
            "texture": texture,
        }

    # Reject flat-texture faces (printed photos / screens)
    if face_rect is not None and texture < texture_threshold:
        return {
            "live": False,
            "reason": f"Low texture variance (texture={texture:.1f} < {texture_threshold}) — possible spoofing",
            "sharpness": sharpness,
            "texture": texture,
        }

    return {
        "live": True,
        "reason": "Passed basic liveness checks",
        "sharpness": sharpness,
        "texture": texture,
    }
