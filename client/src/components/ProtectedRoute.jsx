import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, role }) {
  const { user, role: userRole, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to={role === "admin" ? "/admin/login" : "/student/login"} replace />;
  if (role && userRole !== role) return <Navigate to="/" replace />;

  return children;
}
