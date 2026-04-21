
require("dotenv").config(); // This must stay at the very top
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/db");

// ... rest of your code remains the same

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");
const socketHandler = require("./socket/socketHandler");

const app = express();
const server = http.createServer(app);

// ── Allowed origins (production + local dev) ────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,      // e.g. https://attend-ai.vercel.app
  "http://localhost:5173",     // local Vite dev server
].filter(Boolean);

// ── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});
socketHandler(io);

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server calls (no origin header) and whitelisted origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy blocked request from: ${origin}`));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);

// Internal: Python CV service calls this to fetch student list
// Authenticated via internal API key
const { requireInternal } = require("./middleware/authMiddleware");
const { listAllStudents } = require("./controllers/adminController");
app.get("/api/students/list", requireInternal, listAllStudents);

app.get("/", (_, res) => res.json({ message: "Attendance API is running ✅" }));

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((_, res) => res.status(404).json({ message: "Route not found" }));

// ── Error handler ────────────────────────────────────────────────────────────
app.use((err, _, res, __) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || "Internal server error" });
});

// ── Start ────────────────────────────────────────────────────────────────────
// Render injects PORT dynamically; fall back to 5000 for local dev only.
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  server.listen(PORT, "0.0.0.0", () => {
    const env = process.env.NODE_ENV || "development";
    const url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    console.log(`🚀  Server running in [${env}] mode → ${url}`);

    // Keep-alive self-ping (prevents Render free tier from sleeping)
    if (process.env.NODE_ENV === "production" && process.env.RENDER_EXTERNAL_URL) {
      setInterval(async () => {
        try {
          await fetch(`${process.env.RENDER_EXTERNAL_URL}/`);
          console.log("💓 Keep-alive ping sent");
        } catch (e) {
          console.warn("Keep-alive ping failed:", e.message);
        }
      }, 14 * 60 * 1000); // every 14 minutes
    }
  });
});
