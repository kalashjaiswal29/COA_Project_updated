import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Logo = () => (
  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
    <div style={{
      width: 36, height: 36, borderRadius: 10,
      background: "linear-gradient(135deg, #4338ca, #f97316)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "1.1rem", fontWeight: 800, color: "#fff",
      boxShadow: "0 0 18px rgba(99,102,241,0.4)"
    }}>A</div>
    <span style={{ fontWeight: 800, fontSize: "1.15rem", letterSpacing: "-0.02em" }}>
      Attend<span style={{ color: "#f97316" }}>AI</span>
    </span>
  </div>
);

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const adminLinks = [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/create-class", label: "New Class" },
    { to: "/admin/directory", label: "Directory" },
  ];
  const studentLinks = [
    { to: "/student", label: "Dashboard" },
    { to: "/student/attendance", label: "My Attendance" },
  ];
  const links = role === "admin" ? adminLinks : studentLinks;

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(10,15,30,0.85)",
      backdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      height: 64,
      display: "flex", alignItems: "center",
    }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        <Link to={role === "admin" ? "/admin" : "/student"}><Logo /></Link>

        {/* Desktop links */}
        <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }} className="nav-links">
          {links.map((l) => {
            const isActive = l.to === "/admin" || l.to === "/student"
              ? location.pathname === l.to
              : location.pathname.startsWith(l.to);
            return (
              <Link key={l.to} to={l.to} style={{
                padding: "0.45rem 1rem",
                borderRadius: 8,
                fontSize: "0.9rem",
                fontWeight: 500,
                color: isActive ? "#f97316" : "#94a3b8",
                background: isActive ? "rgba(249,115,22,0.1)" : "transparent",
                transition: "all 0.2s",
              }}>{l.label}</Link>
            );
          })}
        </div>

        {/* User info + logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#f1f5f9" }}>{user?.name}</div>
            <div style={{ fontSize: "0.75rem", color: "#6366f1", fontWeight: 500, textTransform: "capitalize" }}>
              {role}
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm">
            Logout
          </button>
        </div>
      </div>

      <style>{`
        @media(max-width:640px){
          .nav-links { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
