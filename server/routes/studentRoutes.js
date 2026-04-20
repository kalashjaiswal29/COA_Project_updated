const express = require("express");
const router = express.Router();
const { protect, requireStudent } = require("../middleware/authMiddleware");
const {
  getMyAttendance,
  getMyAttendanceSummary,
  getAllClasses,
} = require("../controllers/studentController");

router.use(protect, requireStudent);

router.get("/attendance", getMyAttendance);
router.get("/attendance/summary", getMyAttendanceSummary);
router.get("/classes", getAllClasses);

module.exports = router;
