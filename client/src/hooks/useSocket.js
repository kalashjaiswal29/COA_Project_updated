import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export const useSocket = () => {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket"],
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

  const sendFrame = useCallback((classId, image, date) => {
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
