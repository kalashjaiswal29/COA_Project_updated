import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function CreateClass() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ subject: "", days: [], startTime: "09:00", duration: "60" });
  const [loading, setLoading] = useState(false);

  const toggleDay = (day) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.days.length === 0) { toast.error("Select at least one day"); return; }
    setLoading(true);
    try {
      await api.post("/admin/classes", { ...form, days: JSON.stringify(form.days) });
      toast.success("Class created successfully!");
      navigate("/admin");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create class");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: "2rem", paddingBottom: "2rem", maxWidth: 640 }}>
      <div style={{ marginBottom: "2rem" }} className="fade-in-up">
        <button onClick={() => navigate("/admin")} className="btn btn-ghost btn-sm" style={{ marginBottom: "1rem" }}>
          ← Back
        </button>
        <h1>Create <span className="gradient-text">New Class</span></h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.4rem" }}>
          Schedule a recurring class for attendance scanning
        </p>
      </div>

      <div className="card card-pad fade-in-up">
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Subject */}
          <div className="form-group">
            <label className="form-label" htmlFor="subject">Subject Name</label>
            <input id="subject" className="form-input" placeholder="e.g. Data Structures & Algorithms"
              value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
          </div>

          {/* Days */}
          <div className="form-group">
            <label className="form-label">Days of Week</label>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  id={`day-${day.toLowerCase()}`}
                  onClick={() => toggleDay(day)}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: 8,
                    border: "1px solid",
                    borderColor: form.days.includes(day) ? "var(--indigo-500)" : "var(--border)",
                    background: form.days.includes(day) ? "rgba(99,102,241,0.15)" : "transparent",
                    color: form.days.includes(day) ? "var(--indigo-300)" : "var(--text-muted)",
                    fontWeight: form.days.includes(day) ? 600 : 400,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Time + Duration row */}
          <div className="grid-2" style={{ gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="startTime">Start Time</label>
              <input id="startTime" type="time" className="form-input"
                value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="duration">Duration (minutes)</label>
              <select id="duration" className="form-select"
                value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}>
                {[30, 45, 60, 75, 90, 120].map((d) => (
                  <option key={d} value={d}>{d} minutes</option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview */}
          {form.subject && form.days.length > 0 && (
            <div style={{
              padding: "1rem 1.25rem", borderRadius: 10,
              background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)"
            }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>Preview</div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{form.subject}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginTop: "0.2rem" }}>
                {form.days.join(", ")} · {form.startTime} · {form.duration} min
              </div>
            </div>
          )}

          <button id="create-class-submit" type="submit" className="btn btn-orange btn-block btn-lg" disabled={loading}>
            {loading ? <><span className="spinner" /> Creating...</> : "✓ Create Class"}
          </button>
        </form>
      </div>
    </div>
  );
}
