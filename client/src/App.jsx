import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

// Auth pages
import StudentLogin from "./pages/auth/StudentLogin";
import StudentRegister from "./pages/auth/StudentRegister";
import AdminLogin from "./pages/auth/AdminLogin";
import AdminRegister from "./pages/auth/AdminRegister";

// Student pages
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentAttendance from "./pages/student/StudentAttendance";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import CreateClass from "./pages/admin/CreateClass";
import AttendanceReport from "./pages/admin/AttendanceReport";
import AdminDirectory from "./pages/admin/AdminDirectory";

// Shared
import AttendanceScan from "./pages/AttendanceScan";

function AppRouter() {
  const { user, role } = useAuth();

  if (user) {
    if (role === "student") {
      return (
        <>
          <Navbar />
          <div className="page-with-nav">
            <Routes>
              <Route path="/student" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
              <Route path="/student/attendance" element={<ProtectedRoute role="student"><StudentAttendance /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/student" replace />} />
            </Routes>
          </div>
        </>
      );
    }
    if (role === "admin") {
      return (
        <>
          <Navbar />
          <div className="page-with-nav">
            <Routes>
              <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/create-class" element={<ProtectedRoute role="admin"><CreateClass /></ProtectedRoute>} />
              <Route path="/admin/attendance/:classId" element={<ProtectedRoute role="admin"><AttendanceReport /></ProtectedRoute>} />
              <Route path="/admin/scan/:classId" element={<ProtectedRoute role="admin"><AttendanceScan /></ProtectedRoute>} />
              <Route path="/admin/directory" element={<ProtectedRoute role="admin"><AdminDirectory /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </div>
        </>
      );
    }
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/student/login" replace />} />
      <Route path="/student/login" element={<StudentLogin />} />
      <Route path="/student/register" element={<StudentRegister />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/register" element={<AdminRegister />} />
      <Route path="*" element={<Navigate to="/student/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return <AppRouter />;
}
