import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const apiUrl = import.meta.env.VITE_API_URL || "";
const SOCKET_URL = apiUrl ? apiUrl.replace("/api", "") : "http://localhost:5000";

export const useSocket = () => {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ["polling", "websocket"],
      withCredentials: true,
      autoConnect: true,
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const joinScan = useCallback((classId) => {
    socketRef.current?.emit("join_scan", { classId });
  }, []);

  const leaveScan = useCallback((classId) => {
    socketRef.current?.emit("leave_scan", { classId });
  }, []);

  const lastEmitRef = useRef(0);

  const sendFrame = useCallback((classId, image, date) => {
    const now = Date.now();
    if (now - lastEmitRef.current < 1000) return;
    lastEmitRef.current = now;
    socketRef.current?.emit("frame", { classId, image, date });
  }, []);

  const onAttendanceUpdate = useCallback((cb) => {
    socketRef.current?.on("attendance_update", cb);
    return () => socketRef.current?.off("attendance_update", cb);
  }, []);

  const onRecognitionResult = useCallback((cb) => {
    socketRef.current?.on("recognition_result", cb);
    return () => socketRef.current?.off("recognition_result", cb);
  }, []);

  return { joinScan, leaveScan, sendFrame, onAttendanceUpdate, onRecognitionResult, socket: socketRef };
};
