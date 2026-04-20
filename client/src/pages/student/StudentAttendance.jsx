import { useState, useEffect } from "react";
import api from "../../services/api";

export default function StudentAttendance() {
  const [records, setRecords] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({ classId: "", date: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/student/classes").then((r) => setClasses(r.data)).catch(() => {});
    fetchRecords();
  }, []);

  const fetchRecords = async (f = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.classId || filters.classId) params.set("classId", f.classId ?? filters.classId);
      if (f.date || filters.date) params.set("date", f.date ?? filters.date);
      const { data } = await api.get(`/student/attendance?${params}`);
      setRecords(data);
    } catch { } finally { setLoading(false); }
  };

  const applyFilters = () => fetchRecords(filters);
  const clearFilters = () => { setFilters({ classId: "", date: "" }); fetchRecords({}); };

  return (
    <div className="container" style={{ paddingTop: "2rem", paddingBottom: "2rem" }}>
      <div style={{ marginBottom: "2rem" }} className="fade-in-up">
        <h1>My <span className="gradient-text">Attendance</span></h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.4rem" }}>View and filter your attendance by subject or date</p>
      </div>

      {/* Filters */}
      <div className="card card-pad fade-in-up" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="form-group" style={{ flex: "1 1 200px" }}>
            <label className="form-label">Filter by Subject</label>
            <select className="form-select" value={filters.classId}
              onChange={(e) => setFilters({ ...filters, classId: e.target.value })}>
              <option value="">All Subjects</option>
              {classes.map((c) => <option key={c._id} value={c._id}>{c.subject}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: "1 1 200px" }}>
            <label className="form-label">Filter by Date</label>
            <input type="date" className="form-input" value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn btn-primary" onClick={applyFilters}>Apply</button>
            <button className="btn btn-ghost" onClick={clearFilters}>Clear</button>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="card fade-in-up">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}><div className="spinner" /></div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: "3rem" }}>📭</div>
            <p>No attendance records found.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Start Time</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Marked At</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r._id}>
                    <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{r.classId?.subject}</td>
                    <td>{r.date}</td>
                    <td>{r.classId?.startTime}</td>
                    <td>{r.classId?.duration} min</td>
                    <td>
                      <span className={`badge ${r.status === "Present" ? "badge-present" : "badge-absent"}`}>
                        {r.status === "Present" ? "✓ " : "✗ "}{r.status}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {r.markedAt ? new Date(r.markedAt).toLocaleTimeString("en-IN") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
