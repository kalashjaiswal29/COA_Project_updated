import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function StudentLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ entryNumber: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/student/login", form);
      login(data.token, data.user, "student");
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate("/student");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Hero Panel */}
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
            Smart Attendance,<br />
            <span className="gradient-text">Powered by AI</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 380, marginBottom: "2.5rem" }}>
            Automated face-recognition attendance system for colleges. Just show your face — we handle the rest.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {["🎯 One-click attendance via face scan","📊 Real-time attendance dashboard","🔒 Liveness detection prevents spoofing"].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="auth-form-side">
        <div className="auth-form-box fade-in-up">
          <div style={{ marginBottom: "2rem" }}>
            <div className="badge badge-indigo" style={{ marginBottom: "1rem" }}>Student Portal</div>
            <h2>Welcome back</h2>
            <p style={{ color: "var(--text-secondary)", marginTop: "0.4rem", fontSize: "0.9rem" }}>
              Sign in with your College Entry Number
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="entryNumber">Entry Number</label>
              <input id="entryNumber" name="entryNumber" className="form-input" placeholder="e.g. 2022UCS1234"
                value={form.entryNumber} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" className="form-input" placeholder="••••••••"
                value={form.password} onChange={handleChange} required />
            </div>
            <button id="student-login-btn" type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
              {loading ? <><span className="spinner" /> Signing in...</> : "Sign In"}
            </button>
          </form>

          <div className="divider" style={{ margin: "1.5rem 0" }}>or</div>

          <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            New student?{" "}
            <Link to="/student/register" style={{ color: "var(--orange-400)", fontWeight: 600 }}>Register here</Link>
          </p>
          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "0.75rem" }}>
            Are you an admin?{" "}
            <Link to="/admin/login" style={{ color: "var(--indigo-400)" }}>Admin Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
