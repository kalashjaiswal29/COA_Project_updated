import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClasses = () => {
    setLoading(true);
    api.get("/admin/classes")
      .then((r) => setClasses(r.data))
      .catch(() => toast.error("Failed to load classes"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchClasses(); }, []);

  const deleteClass = async (id) => {
    if (!confirm("Deactivate this class?")) return;
    try {
      await api.delete(`/admin/classes/${id}`);
      toast.success("Class deactivated");
      fetchClasses();
    } catch { toast.error("Failed to deactivate"); }
  };

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long" });

  return (
    <div className="container" style={{ paddingTop: "2rem", paddingBottom: "2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2.5rem", flexWrap: "wrap", gap: "1rem" }} className="fade-in-up">
        <div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.3rem" }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
          <h1>Welcome, <span className="gradient-text">Prof. {user?.name?.split(" ").pop()}</span></h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.4rem" }}>
            Admin ID: <strong style={{ color: "var(--orange-400)" }}>{user?.adminId}</strong>
          </p>
        </div>
        <Link to="/admin/create-class" className="btn btn-orange btn-lg" id="create-class-btn">
          + New Class
        </Link>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: "2rem" }}>
        {[
          { label: "Active Classes", value: classes.length, color: "var(--indigo-400)" },
          { label: "Subjects", value: user?.subjects?.length || 0, color: "var(--orange-400)" },
          { label: "Today", value: today, color: "var(--success)" },
        ].map((s) => (
          <div key={s.label} className="stat-card fade-in-up">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color, fontSize: typeof s.value === "string" ? "1.3rem" : "2rem" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Classes list */}
      <div className="card card-pad fade-in-up">
        <h3 style={{ marginBottom: "1.5rem" }}>Your Classes</h3>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}><div className="spinner" /></div>
        ) : classes.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: "3rem" }}>🏫</div>
            <p>No classes yet.</p>
            <Link to="/admin/create-class" className="btn btn-primary" style={{ marginTop: "0.5rem" }}>Create your first class</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {classes.map((cls) => (
              <div key={cls._id} className="card" style={{ padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                    {cls.subject}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span className="badge badge-indigo">⏰ {cls.startTime}</span>
                    <span className="badge badge-orange">⏱ {cls.duration} min</span>
                    {cls.days.map((d) => <span key={d} className="badge badge-present">{d.slice(0,3)}</span>)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <Link to={`/admin/scan/${cls._id}`} className="btn btn-primary btn-sm" id={`scan-${cls._id}`}>
                    📡 Start Scan
                  </Link>
                  <Link to={`/admin/attendance/${cls._id}`} className="btn btn-ghost btn-sm">
                    📊 Report
                  </Link>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteClass(cls._id)}>
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
