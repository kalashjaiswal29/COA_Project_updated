import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ adminId: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/admin/login", form);
      login(data.token, data.user, "admin");
      toast.success(`Welcome, Prof. ${data.user.name}!`);
      navigate("/admin");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-hero fade-in-up">
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "linear-gradient(135deg,#4338ca,#f97316)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.6rem", fontWeight: 800, color: "#fff",
            boxShadow: "0 0 32px rgba(99,102,241,0.5)", marginBottom: "2rem"
          }}>A</div>
          <h1 style={{ marginBottom: "1rem" }}>
            Professor<br />
            <span className="gradient-text">Control Panel</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 380, marginBottom: "2.5rem" }}>
            Manage your classes, run live attendance scans, and view detailed reports — all in one place.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {["📅 Schedule and manage classes","📡 Live face-recognition scanning","📈 Detailed attendance analytics"].map(f => (
              <div key={f} style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{f}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-box fade-in-up">
          <div style={{ marginBottom: "2rem" }}>
            <div className="badge badge-orange" style={{ marginBottom: "1rem" }}>Admin Portal</div>
            <h2>Admin Sign In</h2>
            <p style={{ color: "var(--text-secondary)", marginTop: "0.4rem", fontSize: "0.9rem" }}>
              Use your unique Admin ID to sign in
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="adminId">Admin ID</label>
              <input id="adminId" name="adminId" className="form-input" placeholder="e.g. PROF001"
                value={form.adminId} onChange={(e) => setForm({ ...form, adminId: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-password">Password</label>
              <input id="admin-password" name="password" type="password" className="form-input" placeholder="••••••••"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button id="admin-login-btn" type="submit" className="btn btn-orange btn-block btn-lg" disabled={loading}>
              {loading ? <><span className="spinner" /> Signing in...</> : "Sign In as Admin"}
            </button>
          </form>

          <div className="divider" style={{ margin: "1.5rem 0" }}>or</div>

          <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            New admin?{" "}
            <Link to="/admin/register" style={{ color: "var(--orange-400)", fontWeight: 600 }}>Register here</Link>
          </p>
          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "0.75rem" }}>
            Are you a student?{" "}
            <Link to="/student/login" style={{ color: "var(--indigo-400)" }}>Student Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
