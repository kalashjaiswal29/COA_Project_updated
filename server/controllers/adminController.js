const Class = require("../models/Class");
const Attendance = require("../models/Attendance");
const Student = require("../models/Student");

// ─── CLASSES ─────────────────────────────────────────────────────────────────

exports.createClass = async (req, res) => {
  try {
    const { subject, days, startTime, duration } = req.body;
    const daysArr = Array.isArray(days) ? days : JSON.parse(days);

    const newClass = await Class.create({
      subject,
      adminId: req.userId,
      days: daysArr,
      startTime,
      duration: Number(duration),
    });

    res.status(201).json(newClass);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyClasses = async (req, res) => {
  try {
    const classes = await Class.find({ adminId: req.userId, isActive: true }).sort({ createdAt: -1 });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteClass = async (req, res) => {
  try {
    const cls = await Class.findOneAndUpdate(
      { _id: req.params.id, adminId: req.userId },
      { isActive: false },
      { new: true }
    );
    if (!cls) return res.status(404).json({ message: "Class not found" });
    res.json({ message: "Class deactivated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── ATTENDANCE REPORTS ───────────────────────────────────────────────────────

/**
 * GET /api/admin/attendance/:classId
 * Returns all attendance records for a class, optionally filtered by date.
 */
exports.getAttendanceByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { date } = req.query; // optional ?date=2024-06-10

    const cls = await Class.findOne({ _id: classId, adminId: req.userId });
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const filter = { classId };
    if (date) filter.date = date;

    const records = await Attendance.find(filter)
      .populate("studentId", "name entryNumber department year")
      .sort({ date: -1, markedAt: -1 });

    res.json({ class: cls, records });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/admin/attendance/:classId/summary
 * Returns per-student total present count for the class.
 */
exports.getAttendanceSummary = async (req, res) => {
  try {
    const { classId } = req.params;

    const cls = await Class.findOne({ _id: classId, adminId: req.userId });
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const summary = await Attendance.aggregate([
      { $match: { classId: cls._id, status: "Present" } },
      { $group: { _id: "$studentId", totalPresent: { $sum: 1 } } },
      {
        $lookup: {
          from: "students",
          localField: "_id",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
      {
        $project: {
          _id: 0,
          studentId: "$_id",
          name: "$student.name",
          entryNumber: "$student.entryNumber",
          department: "$student.department",
          totalPresent: 1,
        },
      },
      { $sort: { name: 1 } },
    ]);

    res.json({ class: cls, summary });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── STUDENT LIST (for Python cache endpoint) ─────────────────────────────────
// This is called by the Python CV service on startup — no auth required (internal)
exports.listAllStudents = async (req, res) => {
  try {
    const students = await Student.find({}, "name entryNumber faceImageUrl");
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
