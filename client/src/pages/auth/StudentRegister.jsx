import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function StudentRegister() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    name: "", entryNumber: "", email: "", password: "",
    department: "", year: "1",
  });
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error("Please upload your face photo"); return; }

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append("faceImage", file);

    setLoading(true);
    try {
      const { data } = await api.post("/auth/student/register", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      login(data.token, data.user, "student");
      toast.success("Registration successful!");
      navigate("/student");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

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
            Register Once,<br />
            <span className="gradient-text">Attend Forever</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 380, marginBottom: "2rem" }}>
            Upload a clear, well-lit photo of your face. This will be used to verify your attendance automatically.
          </p>
          <div style={{ padding: "1rem 1.25rem", borderRadius: 12, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)" }}>
            <p style={{ color: "var(--orange-300)", fontSize: "0.85rem", lineHeight: 1.6 }}>
              📸 <strong>Photo Tips:</strong> Use a well-lit environment, look directly at the camera, and ensure only your face is visible.
            </p>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-box fade-in-up">
          <div style={{ marginBottom: "1.5rem" }}>
            <div className="badge badge-indigo" style={{ marginBottom: "1rem" }}>Student Registration</div>
            <h2>Create your Account</h2>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Face photo upload */}
            <div onClick={() => fileRef.current?.click()} style={{
              border: "2px dashed",
              borderColor: preview ? "var(--indigo-500)" : "var(--border)",
              borderRadius: 12, padding: "1rem", textAlign: "center",
              cursor: "pointer", transition: "all 0.2s",
              background: preview ? "rgba(99,102,241,0.05)" : "transparent",
            }}>
              {preview ? (
                <img src={preview} alt="Face preview" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", margin: "0 auto" }} />
              ) : (
                <>
                  <div style={{ fontSize: "2rem", marginBottom: "0.35rem" }}>📷</div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Click to upload face photo</div>
                </>
              )}
              <input id="faceImage" ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
            </div>

            <div className="grid-2" style={{ gap: "0.85rem" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-name">Full Name</label>
                <input id="reg-name" className="form-input" placeholder="Jane Doe" value={form.name} onChange={set("name")} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="entry">Entry Number</label>
                <input id="entry" className="form-input" placeholder="2022UCS1234" value={form.entryNumber} onChange={set("entryNumber")} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">College Email</label>
              <input id="reg-email" type="email" className="form-input" placeholder="jane@college.edu" value={form.email} onChange={set("email")} required />
            </div>

            <div className="grid-2" style={{ gap: "0.85rem" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="dept">Department</label>
                <input id="dept" className="form-input" placeholder="Computer Science" value={form.department} onChange={set("department")} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="year">Year</label>
                <select id="year" className="form-select" value={form.year} onChange={set("year")}>
                  {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-pass">Password</label>
              <input id="reg-pass" type="password" className="form-input" placeholder="••••••••" value={form.password} onChange={set("password")} required minLength={6} />
            </div>

            <button id="student-register-btn" type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
              {loading ? <><span className="spinner" /> Registering...</> : "Create Account"}
            </button>
          </form>

          <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "1.25rem" }}>
            Already registered?{" "}
            <Link to="/student/login" style={{ color: "var(--indigo-400)", fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
