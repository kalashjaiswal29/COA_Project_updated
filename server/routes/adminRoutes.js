const express = require("express");
const router = express.Router();
const { protect, requireAdmin } = require("../middleware/authMiddleware");
const {
  createClass,
  getMyClasses,
  deleteClass,
  getAttendanceByClass,
  getAttendanceSummary,
  listAllStudents,
  getAllStudents,
  cvSync,
} = require("../controllers/adminController");

// Internal route moved to server.js

// All routes below require admin JWT
router.use(protect, requireAdmin);

router.post("/classes", createClass);
router.get("/classes", getMyClasses);
router.delete("/classes/:id", deleteClass);

router.get("/attendance/:classId", getAttendanceByClass);
router.get("/attendance/:classId/summary", getAttendanceSummary);

// Admin Student Directory — returns all enrolled students
router.get("/all-students", getAllStudents);

// CV Cache Sync — proxies refresh request to Python CV service
router.post("/cv-sync", cvSync);

module.exports = router;
