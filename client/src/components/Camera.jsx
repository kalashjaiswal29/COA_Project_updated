import { useRef, useEffect, useCallback } from "react";

/**
 * Camera component:
 * - Renders a <video> element with webcam feed
 * - Exposes captureFrame() → returns base64 JPEG string
 * - Calls onFrame(base64) every `intervalMs` milliseconds when `active` is true
 */
export default function Camera({ onFrame, intervalMs = 10000, active = false, style = {} }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  // Start webcam
  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    };

    startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Capture a single frame as base64
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  }, []);

  // Auto-capture loop
  useEffect(() => {
    if (!active || !onFrame) return;

    const tick = () => {
      const frame = captureFrame();
      if (frame) onFrame(frame);
    };

    tick(); // immediate first capture
    timerRef.current = setInterval(tick, intervalMs);

    return () => clearInterval(timerRef.current);
  }, [active, onFrame, intervalMs, captureFrame]);

  return (
    <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", ...style }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: "100%", display: "block", background: "#000", borderRadius: 16 }}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Scan overlay */}
      {active && (
        <div className="scan-overlay">
          <div className="scan-line" />
          <div className="scan-corner tl" />
          <div className="scan-corner tr" />
          <div className="scan-corner bl" />
          <div className="scan-corner br" />
        </div>
      )}
    </div>
  );
}
