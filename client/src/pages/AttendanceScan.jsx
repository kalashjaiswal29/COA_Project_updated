import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Camera from "../components/Camera";
import { useSocket } from "../hooks/useSocket";
import api from "../services/api";

export default function AttendanceScan() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { joinScan, leaveScan, sendFrame, onAttendanceUpdate, onRecognitionResult } = useSocket();

  const [scanning, setScanning] = useState(false);
  const [classInfo, setClassInfo] = useState(null);
  const [markedList, setMarkedList] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const today = new Date().toISOString().split("T")[0];

  // Load class info
  useEffect(() => {
    api.get("/admin/classes")
      .then((r) => {
        const found = r.data.find((c) => c._id === classId);
        setClassInfo(found || null);
      }).catch(() => {});
  }, [classId]);

  // Socket listeners
  useEffect(() => {
    joinScan(classId);

    const cleanupUpdate = onAttendanceUpdate((data) => {
      setMarkedList((prev) => {
        if (prev.find((s) => s.studentId === data.studentId)) return prev;
        return [data, ...prev];
      });
      toast.success(`✓ ${data.studentName} marked Present!`, { duration: 3500 });
    });

    const cleanupResult = onRecognitionResult((data) => {
      setLastResult(data);
      if (data.matched && !data.alreadyMarked && data.newMark) return; // toast already shown via attendance_update
      if (data.alreadyMarked) {
        // Silent — don't spam the UI
      }
      if (!data.matched && data.error !== "No face detected in frame") {
        // Only show errors that aren't "no face" (that's expected noise)
        if (data.liveness_reason && !data.live) {
          toast.error(`Liveness: ${data.liveness_reason}`, { duration: 2500 });
        }
      }
    });

    return () => {
      leaveScan(classId);
      cleanupUpdate?.();
      cleanupResult?.();
    };
  }, [classId]);

  const handleFrame = useCallback(
    (base64Image) => {
      if (!scanning) return;
      sendFrame(classId, base64Image, today);
    },
    [scanning, classId, today, sendFrame]
  );

  return (
    <div className="container" style={{ paddingTop: "2rem", paddingBottom: "2rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }} className="fade-in-up">
        <button onClick={() => { leaveScan(classId); navigate("/admin"); }}
          className="btn btn-ghost btn-sm" style={{ marginBottom: "1rem" }}>← Back</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1>Live <span className="gradient-text">Attendance Scan</span></h1>
            {classInfo && (
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
                <span className="badge badge-orange">{classInfo.subject}</span>
                <span className="badge badge-indigo">⏰ {classInfo.startTime}</span>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  📅 {today}
                </span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            {!scanning ? (
              <button id="start-scan-btn" className="btn btn-orange btn-lg" onClick={() => { setScanning(true); toast.success("Scan started — camera active"); }}>
                ▶ Start Scan
              </button>
            ) : (
              <button id="stop-scan-btn" className="btn btn-danger btn-lg" onClick={() => { setScanning(false); toast("Scan paused"); }}>
                ⏸ Pause Scan
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "1.5rem", alignItems: "start" }}
        className="scan-layout">
        {/* Camera */}
        <div>
          <div style={{ position: "relative" }}>
            <Camera
              onFrame={handleFrame}
              intervalMs={10000}
              active={scanning}
              style={{ border: "2px solid", borderColor: scanning ? "var(--indigo-500)" : "var(--border)", borderRadius: 16 }}
            />
            {/* Status pill */}
            <div style={{
              position: "absolute", top: 14, left: 14,
              display: "flex", alignItems: "center", gap: "0.5rem",
              background: "rgba(10,15,30,0.85)", border: "1px solid",
              borderColor: scanning ? "var(--indigo-500)" : "var(--border)",
              borderRadius: 99, padding: "0.35rem 0.85rem",
              backdropFilter: "blur(8px)", fontSize: "0.8rem", fontWeight: 600,
            }}>
              {scanning ? (
                <>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%", background: "var(--success)",
                    boxShadow: "0 0 8px var(--success)", animation: "pulse 1.5s infinite",
                  }} />
                  <span style={{ color: "var(--success)" }}>Scanning — every 10s</span>
                </>
              ) : (
                <>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--text-muted)" }} />
                  <span style={{ color: "var(--text-muted)" }}>Camera ready — not scanning</span>
                </>
              )}
            </div>
          </div>

          {/* Last recognition result */}
          {lastResult && (
            <div className="card fade-in-up" style={{
              marginTop: "1rem", padding: "1rem 1.25rem",
              borderColor: lastResult.matched ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)",
            }}>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>Last recognition result</div>
              {lastResult.matched ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>✅</span>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{lastResult.studentName}</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                      Confidence: {lastResult.confidence ? `${(lastResult.confidence * 100).toFixed(1)}%` : "—"}
                      {lastResult.alreadyMarked && <span style={{ color: "var(--warning)", marginLeft: "0.5rem" }}>· Already marked</span>}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>{lastResult.live === false ? "🚫" : "🔍"}</span>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
                    {lastResult.error || "No match found"}
                    {lastResult.liveness_reason && <div style={{ color: "var(--error)", fontSize: "0.8rem" }}>{lastResult.liveness_reason}</div>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Marked attendance sidebar */}
        <div className="card card-pad" style={{ maxHeight: "75vh", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3>Marked Present</h3>
            <span className="badge badge-present">{markedList.length}</span>
          </div>

          {markedList.length === 0 ? (
            <div className="empty-state" style={{ padding: "2rem 1rem" }}>
              <div style={{ fontSize: "2.5rem" }}>👀</div>
              <p style={{ fontSize: "0.85rem" }}>No one marked yet.</p>
              <p style={{ fontSize: "0.78rem" }}>Start the scan and face the camera.</p>
            </div>
          ) : (
            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {markedList.map((s, i) => (
                <div key={s.studentId} className="fade-in-up" style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  padding: "0.75rem", borderRadius: 10,
                  background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)",
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "linear-gradient(135deg,var(--indigo-600),var(--orange-500))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", fontWeight: 700, color: "#fff", flexShrink: 0,
                  }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.studentName}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {s.entryNumber} · {s.markedAt ? new Date(s.markedAt).toLocaleTimeString("en-IN") : ""}
                    </div>
                  </div>
                  <span style={{ color: "var(--success)", fontSize: "1rem" }}>✓</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @media(max-width:900px){
          .scan-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
