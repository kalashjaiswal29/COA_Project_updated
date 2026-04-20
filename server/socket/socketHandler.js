/**
 * socketHandler.js
 * Manages Socket.io connections for live attendance scanning.
 *
 * Flow:
 *  1. Admin starts a scan → joins room `class:<classId>`
 *  2. Client emits "frame" with { classId, image (base64) }
 *  3. Server POSTs image to Python CV service
 *  4. If face matched → write attendance (duplicate-safe via unique index)
 *  5. Emit "attendance_update" back to room with result
 */

const axios = require("axios");
const Attendance = require("../models/Attendance");
const Student = require("../models/Student");

// Per-class throttle: studentId → timestamp of last mark (prevents spam within same frame batch)
const recentMarks = new Map();
const THROTTLE_MS = 15_000; // 15 seconds minimum between marks per student

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Join class scan room
    socket.on("join_scan", ({ classId }) => {
      socket.join(`class:${classId}`);
      console.log(`📡 Socket ${socket.id} joined class:${classId}`);
    });

    socket.on("leave_scan", ({ classId }) => {
      socket.leave(`class:${classId}`);
    });

    // ── Core: receive frame ──────────────────────────────────────────────────
    socket.on("frame", async ({ classId, image, date }) => {
      if (!classId || !image) return;

      const today = date || new Date().toISOString().split("T")[0];

      try {
        // 1. Send to Python CV service
        const cvResponse = await axios.post(
          `${process.env.PYTHON_CV_URL}/recognize`,
          { image, classId },
          { timeout: 8000 }
        );

        const { matched, studentId, studentName, confidence, live, liveness_reason, error } =
          cvResponse.data;

        if (!matched) {
          socket.emit("recognition_result", {
            matched: false,
            live,
            liveness_reason,
            error: error || "No match",
          });
          return;
        }

        // 2. Throttle check — avoid hammering DB if same face seen in consecutive frames
        const throttleKey = `${classId}:${studentId}`;
        const lastMark = recentMarks.get(throttleKey) || 0;
        if (Date.now() - lastMark < THROTTLE_MS) {
          socket.emit("recognition_result", {
            matched: true,
            studentId,
            studentName,
            confidence,
            alreadyMarked: true,
            message: "Recently marked — skipping",
          });
          return;
        }

        // 3. Try to insert attendance (unique index prevents duplicates)
        try {
          await Attendance.create({ classId, studentId, date: today, status: "Present" });
          recentMarks.set(throttleKey, Date.now());

          const studentDoc = await Student.findById(studentId, "name entryNumber");

          // 4. Broadcast to entire class room
          io.to(`class:${classId}`).emit("attendance_update", {
            studentId,
            studentName: studentDoc?.name || studentName,
            entryNumber: studentDoc?.entryNumber,
            date: today,
            status: "Present",
            confidence,
            markedAt: new Date().toISOString(),
          });

          socket.emit("recognition_result", {
            matched: true,
            studentId,
            studentName,
            confidence,
            newMark: true,
            message: "Attendance marked ✓",
          });
        } catch (dupErr) {
          // Unique index violation → already marked for today
          if (dupErr.code === 11000) {
            socket.emit("recognition_result", {
              matched: true,
              studentId,
              studentName,
              confidence,
              alreadyMarked: true,
              message: "Already marked present today",
            });
          } else {
            throw dupErr;
          }
        }
      } catch (err) {
        console.error("Frame processing error:", err.message);
        socket.emit("recognition_result", {
          matched: false,
          error: "Server error during recognition",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
};
