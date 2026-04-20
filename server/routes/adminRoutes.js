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
} = require("../controllers/adminController");

// Internal — called by Python CV service (no JWT, network-internal only)
router.get("/students/list", listAllStudents);

// All routes below require admin JWT
router.use(protect, requireAdmin);

router.post("/classes", createClass);
router.get("/classes", getMyClasses);
router.delete("/classes/:id", deleteClass);

router.get("/attendance/:classId", getAttendanceByClass);
router.get("/attendance/:classId/summary", getAttendanceSummary);

module.exports = router;
