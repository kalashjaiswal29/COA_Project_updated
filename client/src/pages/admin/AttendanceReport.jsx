import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function AttendanceReport() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [classInfo, setClassInfo] = useState(null);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState([]);
  const [tab, setTab] = useState("summary"); // "summary" | "daywise"
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [classId]);

  const fetchData = async (filterDate = "") => {
    setLoading(true);
    try {
      const [recRes, sumRes] = await Promise.all([
        api.get(`/admin/attendance/${classId}${filterDate ? `?date=${filterDate}` : ""}`),
        api.get(`/admin/attendance/${classId}/summary`),
      ]);
      setClassInfo(recRes.data.class);
      setRecords(recRes.data.records);
      setSummary(sumRes.data.summary);
    } catch { } finally { setLoading(false); }
  };

  const applyDate = () => fetchData(date);
  const clearDate = () => { setDate(""); fetchData(""); };

  const presentCount = records.filter((r) => r.status === "Present").length;

  return (
    <div className="container" style={{ paddingTop: "2rem", paddingBottom: "2rem" }}>
      <div style={{ marginBottom: "2rem" }} className="fade-in-up">
        <button onClick={() => navigate("/admin")} className="btn btn-ghost btn-sm" style={{ marginBottom: "1rem" }}>
          ← Back to Dashboard
        </button>
        {classInfo && (
          <>
            <h1><span className="gradient-text">{classInfo.subject}</span> — Report</h1>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
              <span className="badge badge-indigo">⏰ {classInfo.startTime}</span>
              <span className="badge badge-orange">⏱ {classInfo.duration} min</span>
              {classInfo.days?.map((d) => <span key={d} className="badge badge-present">{d.slice(0,3)}</span>)}
            </div>
          </>
        )}
      </div>

      {/* Stat strip */}
      <div className="grid-3" style={{ marginBottom: "1.75rem" }}>
        {[
          { label: "Total Records", value: records.length, color: "var(--indigo-400)" },
          { label: "Present", value: presentCount, color: "var(--success)" },
          { label: "Unique Students", value: summary.length, color: "var(--orange-400)" },
        ].map((s) => (
          <div key={s.label} className="stat-card fade-in-up">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
        {["summary", "daywise"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`btn btn-sm ${tab === t ? "btn-primary" : "btn-ghost"}`}
            style={{ textTransform: "capitalize" }}
          >{t === "summary" ? "📊 Total Summary" : "📅 Day-wise"}</button>
        ))}
      </div>

      {/* Day filter (daywise tab) */}
      {tab === "daywise" && (
        <div className="card card-pad fade-in-up" style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="form-group" style={{ flex: "1 1 200px" }}>
              <label className="form-label">Filter by Date</label>
              <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={applyDate}>Apply</button>
            <button className="btn btn-ghost" onClick={clearDate}>Clear</button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}><div className="spinner" /></div>
      ) : tab === "summary" ? (
        <div className="card fade-in-up">
          {summary.length === 0 ? (
            <div className="empty-state"><div style={{ fontSize: "3rem" }}>📭</div><p>No attendance data yet.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Entry Number</th>
                    <th>Department</th>
                    <th>Total Present</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((row, i) => (
                    <tr key={row.studentId}>
                      <td style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                      <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{row.name}</td>
                      <td><span className="badge badge-indigo">{row.entryNumber}</span></td>
                      <td style={{ color: "var(--text-secondary)" }}>{row.department}</td>
                      <td>
                        <span style={{ color: "var(--success)", fontWeight: 700, fontSize: "1.05rem" }}>
                          {row.totalPresent}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="card fade-in-up">
          {records.length === 0 ? (
            <div className="empty-state"><div style={{ fontSize: "3rem" }}>📭</div><p>No records for the selected date.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Entry Number</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Marked At</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r._id}>
                      <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{r.studentId?.name}</td>
                      <td><span className="badge badge-indigo">{r.studentId?.entryNumber}</span></td>
                      <td>{r.date}</td>
                      <td>
                        <span className={`badge ${r.status === "Present" ? "badge-present" : "badge-absent"}`}>
                          {r.status}
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
      )}
    </div>
  );
}
