import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function AdminRegister() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ adminId: "", name: "", email: "", password: "", subjects: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/admin/register", {
        ...form,
        subjects: form.subjects.split(",").map((s) => s.trim()).filter(Boolean),
      });
      login(data.token, data.user, "admin");
      toast.success("Admin account created!");
      navigate("/admin");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const field = (id, label, placeholder, type = "text", name) => (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      <input id={id} name={name || id} type={type} className="form-input" placeholder={placeholder}
        value={form[name || id]} onChange={(e) => setForm({ ...form, [name || id]: e.target.value })} required />
    </div>
  );

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
            Join as<br /><span className="gradient-text">Professor</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 380 }}>
            Create your admin account to start managing classes and running automated attendance.
          </p>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-box fade-in-up">
          <div style={{ marginBottom: "2rem" }}>
            <div className="badge badge-orange" style={{ marginBottom: "1rem" }}>Admin Registration</div>
            <h2>Create Admin Account</h2>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            {field("adminId", "Admin ID", "e.g. PROF001")}
            {field("reg-name", "Full Name", "Dr. John Doe", "text", "name")}
            {field("reg-email", "Email Address", "john@college.edu", "email", "email")}
            {field("reg-password", "Password", "••••••••", "password", "password")}
            <div className="form-group">
              <label className="form-label" htmlFor="subjects">Subjects (comma separated)</label>
              <input id="subjects" name="subjects" className="form-input"
                placeholder="Mathematics, Physics, Computer Science"
                value={form.subjects} onChange={(e) => setForm({ ...form, subjects: e.target.value })} />
            </div>
            <button id="admin-register-btn" type="submit" className="btn btn-orange btn-block btn-lg" disabled={loading}>
              {loading ? <><span className="spinner" /> Creating...</> : "Create Admin Account"}
            </button>
          </form>

          <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "1.5rem" }}>
            Already registered?{" "}
            <Link to="/admin/login" style={{ color: "var(--orange-400)", fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
