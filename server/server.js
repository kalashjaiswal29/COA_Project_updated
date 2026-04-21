
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

// ── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
socketHandler(io);

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
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
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀  Server running on http://localhost:${PORT}`);
  });
});
