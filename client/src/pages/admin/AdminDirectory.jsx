import { useState, useEffect, useMemo } from "react";
import api from "../../services/api";

/* ── helpers ─────────────────────────────────────────────────────────────── */
const dept_colors = {
  CSE: "#6366f1", ECE: "#f97316", ME: "#10b981",
  CE: "#f59e0b",  EE: "#3b82f6", default: "#8b5cf6",
};
const deptColor = (dept = "") =>
  dept_colors[(dept || "").trim().toUpperCase()] || dept_colors.default;

const initials = (name = "") =>
  name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

/* ── Avatar component ────────────────────────────────────────────────────── */
function Avatar({ src, name, size = 44 }) {
  const [err, setErr] = useState(false);
  const color = deptColor(name);

  if (!src || err) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: `linear-gradient(135deg,${color}cc,${color}66)`,
        border: `2px solid ${color}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.36, fontWeight: 700, color: "#fff",
        flexShrink: 0, letterSpacing: "-0.02em",
      }}>
        {initials(name)}
      </div>
    );
  }
  return (
    <img
      src={src} alt={name}
      onError={() => setErr(true)}
      style={{
        width: size, height: size, borderRadius: "50%",
        objectFit: "cover", border: "2px solid rgba(99,102,241,0.4)",
        flexShrink: 0,
      }}
    />
  );
}

/* ── Year badge map ──────────────────────────────────────────────────────── */
const YEAR_LABEL = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th" };

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function AdminDirectory() {
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [query,    setQuery]    = useState("");

  useEffect(() => {
    api.get("/admin/all-students")
      .then((r) => setStudents(r.data))
      .catch((e) => setError(e?.response?.data?.message || "Failed to load students"))
      .finally(() => setLoading(false));
  }, []);

  /* case-insensitive search across name, entryNumber, email, department */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.name, s.entryNumber, s.email, s.department]
        .some((f) => (f || "").toLowerCase().includes(q))
    );
  }, [students, query]);

  /* department breakdown for stat chips */
  const deptMap = useMemo(() => {
    const m = {};
    students.forEach((s) => { m[s.department] = (m[s.department] || 0) + 1; });
    return m;
  }, [students]);

  return (
    <div className="container" style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "2rem" }} className="fade-in-up">
        <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "0.4rem", letterSpacing: "0.04em" }}>
          ADMIN · STUDENT REGISTRY
        </p>
        <h1>
          Student{" "}
          <span className="gradient-text">Directory</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.4rem", fontSize: "0.95rem" }}>
          All enrolled students with face-recognition profiles.
        </p>
      </div>

      {/* ── Stat chips ──────────────────────────────────────────────────── */}
      {!loading && !error && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginBottom: "1.75rem" }} className="fade-in-up">
          <DeptChip label="Total" count={students.length} color="#6366f1" />
          {Object.entries(deptMap).sort().map(([dept, cnt]) => (
            <DeptChip key={dept} label={dept} count={cnt} color={deptColor(dept)} />
          ))}
        </div>
      )}

      {/* ── Search bar ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "1.25rem", position: "relative" }} className="fade-in-up">
        <span style={{
          position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)",
          fontSize: "1rem", opacity: 0.45, pointerEvents: "none",
        }}>🔍</span>
        <input
          id="directory-search"
          type="text"
          className="form-input"
          placeholder="Search by name, entry number, email or department…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ paddingLeft: "2.5rem", borderRadius: "var(--radius-md)" }}
        />
      </div>

      {/* ── Table card ──────────────────────────────────────────────────── */}
      <div className="card fade-in-up" style={{
        background: "linear-gradient(160deg,rgba(29,27,75,0.65) 0%,rgba(13,18,38,0.85) 100%)",
        border: "1px solid rgba(99,102,241,0.18)",
        backdropFilter: "blur(18px)",
        borderRadius: "var(--radius-xl)",
        overflow: "hidden",
      }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "5rem", gap: "1rem" }}>
            <div className="spinner" />
            <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Loading student registry…</span>
          </div>
        ) : error ? (
          <div className="empty-state">
            <div style={{ fontSize: "2.5rem" }}>⚠️</div>
            <p style={{ color: "var(--error)" }}>{error}</p>
          </div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: "3rem" }}>🎓</div>
            <p>No students enrolled yet.</p>
            <p style={{ fontSize: "0.82rem" }}>Students appear here after they register via the student portal.</p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ background: "rgba(99,102,241,0.08)", borderBottom: "1px solid rgba(99,102,241,0.2)" }}>
                    {["#", "Student", "Entry Number", "Department", "Year", "Email", "Enrolled"].map((h) => (
                      <th key={h} style={{
                        padding: "1rem 1.25rem", textAlign: "left",
                        fontSize: "0.72rem", fontWeight: 600, color: "var(--indigo-400)",
                        textTransform: "uppercase", letterSpacing: "0.07em",
                        whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                        No students match "{query}"
                      </td>
                    </tr>
                  ) : (
                    filtered.map((s, i) => (
                      <StudentRow key={s._id} s={s} index={i} />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer count */}
            {query && (
              <div style={{
                padding: "0.75rem 1.5rem",
                fontSize: "0.8rem", color: "var(--text-muted)",
                borderTop: "1px solid rgba(255,255,255,0.05)",
                background: "rgba(0,0,0,0.15)",
              }}>
                Showing <strong style={{ color: "var(--indigo-400)" }}>{filtered.length}</strong> of{" "}
                <strong>{students.length}</strong> students
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Row sub-component ───────────────────────────────────────────────────── */
function StudentRow({ s, index }) {
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        background: hovered
          ? "rgba(99,102,241,0.06)"
          : index % 2 === 1 ? "rgba(255,255,255,0.015)" : "transparent",
        transition: "background 0.15s",
      }}
    >
      {/* # */}
      <td style={{ padding: "0.85rem 1.25rem", color: "var(--text-muted)", fontSize: "0.75rem", width: 48 }}>
        {index + 1}
      </td>

      {/* Student (avatar + name) */}
      <td style={{ padding: "0.85rem 1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Avatar src={s.faceImageUrl} name={s.name} size={40} />
          <span style={{ fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
            {s.name}
          </span>
        </div>
      </td>

      {/* Entry Number */}
      <td style={{ padding: "0.85rem 1.25rem" }}>
        <span style={{
          fontFamily: "monospace", fontSize: "0.82rem",
          background: "rgba(249,115,22,0.1)", color: "var(--orange-400)",
          padding: "0.2rem 0.6rem", borderRadius: 6,
          border: "1px solid rgba(249,115,22,0.25)",
        }}>{s.entryNumber}</span>
      </td>

      {/* Department */}
      <td style={{ padding: "0.85rem 1.25rem" }}>
        <span style={{
          padding: "0.2rem 0.7rem", borderRadius: 99,
          fontSize: "0.75rem", fontWeight: 600,
          background: `${deptColor(s.department)}20`,
          color: deptColor(s.department),
          border: `1px solid ${deptColor(s.department)}40`,
        }}>{s.department}</span>
      </td>

      {/* Year */}
      <td style={{ padding: "0.85rem 1.25rem", color: "var(--text-secondary)" }}>
        {YEAR_LABEL[s.year] || s.year} Year
      </td>

      {/* Email */}
      <td style={{ padding: "0.85rem 1.25rem", color: "var(--text-secondary)", fontSize: "0.83rem", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {s.email}
      </td>

      {/* Enrolled date */}
      <td style={{ padding: "0.85rem 1.25rem", color: "var(--text-muted)", fontSize: "0.78rem", whiteSpace: "nowrap" }}>
        {s.createdAt
          ? new Date(s.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
          : "—"}
      </td>
    </tr>
  );
}

/* ── Stat chip sub-component ─────────────────────────────────────────────── */
function DeptChip({ label, count, color }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "0.4rem",
      padding: "0.3rem 0.8rem", borderRadius: 99,
      background: `${color}18`, border: `1px solid ${color}35`,
      fontSize: "0.78rem", fontWeight: 600, color,
    }}>
      {label}
      <span style={{
        background: `${color}30`, borderRadius: 99,
        padding: "0.05rem 0.45rem", fontSize: "0.7rem",
      }}>{count}</span>
    </div>
  );
}
