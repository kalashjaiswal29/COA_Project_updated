import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from "recharts";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/student/attendance/summary")
      .then((r) => setSummary(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalPresent = summary.reduce((s, r) => s + r.totalPresent, 0);
  const totalRecords = summary.reduce((s, r) => s + r.totalRecords, 0);
  const overall = totalRecords ? Math.round((totalPresent / totalRecords) * 100) : 0;

  return (
    <div className="container" style={{ paddingTop: "2rem", paddingBottom: "2rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2.5rem" }} className="fade-in-up">
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.3rem" }}>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
        <h1>Hello, <span className="gradient-text">{user?.name?.split(" ")[0]}</span> 👋</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.4rem" }}>
          Entry: <strong style={{ color: "var(--indigo-400)" }}>{user?.entryNumber}</strong> &nbsp;·&nbsp; {user?.department} · Year {user?.year}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid-4" style={{ marginBottom: "2rem" }}>
        {[
          { label: "Overall Attendance", value: `${overall}%`, sub: "across all subjects", color: overall >= 75 ? "var(--success)" : "var(--error)" },
          { label: "Classes Present", value: totalPresent, sub: "total present count", color: "var(--indigo-400)" },
          { label: "Total Records", value: totalRecords, sub: "classes recorded", color: "var(--orange-400)" },
          { label: "Subjects", value: summary.length, sub: "enrolled subjects", color: "var(--indigo-300)" },
        ].map((s) => (
          <div key={s.label} className="stat-card fade-in-up">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Subject-wise table */}
      <div className="card card-pad fade-in-up" style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h3>Subject-wise Attendance</h3>
          <Link to="/student/attendance" className="btn btn-ghost btn-sm">View Details →</Link>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}><div className="spinner" /></div>
        ) : summary.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: "3rem" }}>📋</div>
            <p>No attendance records yet.</p>
            <p style={{ fontSize: "0.85rem" }}>Attendance will appear here after your first class scan.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Present</th>
                  <th>Total</th>
                  <th>Percentage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={row.classId}>
                    <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{row.subject}</td>
                    <td style={{ color: "var(--success)" }}>{row.totalPresent}</td>
                    <td>{row.totalRecords}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div className="progress-bar-wrap" style={{ width: 80 }}>
                          <div className="progress-bar" style={{ width: `${row.percentage}%` }} />
                        </div>
                        <span style={{ color: row.percentage >= 75 ? "var(--success)" : "var(--error)", fontWeight: 600 }}>
                          {row.percentage}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${row.percentage >= 75 ? "badge-present" : "badge-absent"}`}>
                        {row.percentage >= 75 ? "✓ Good" : "⚠ Low"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Profile card */}
      <div className="card card-pad fade-in-up">
        <h3 style={{ marginBottom: "1.25rem" }}>My Profile</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
          <img src={user?.faceImageUrl} alt="Profile" style={{
            width: 72, height: 72, borderRadius: "50%", objectFit: "cover",
            border: "3px solid var(--indigo-500)", boxShadow: "var(--shadow-indigo)"
          }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{user?.name}</div>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{user?.email}</div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
              <span className="badge badge-indigo">{user?.entryNumber}</span>
              <span className="badge badge-orange">{user?.department}</span>
              <span className="badge badge-indigo">Year {user?.year}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
