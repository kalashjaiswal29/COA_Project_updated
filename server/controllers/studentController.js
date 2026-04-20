const Attendance = require("../models/Attendance");
const Class = require("../models/Class");

/**
 * GET /api/student/attendance
 * Returns attendance records for the logged-in student.
 * Optional query params: ?classId=... &date=...
 */
exports.getMyAttendance = async (req, res) => {
  try {
    const filter = { studentId: req.userId };
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.date) filter.date = req.query.date;

    const records = await Attendance.find(filter)
      .populate("classId", "subject days startTime duration")
      .sort({ date: -1, markedAt: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/student/attendance/summary
 * Per-subject summary: totalClasses held vs present count.
 */
exports.getMyAttendanceSummary = async (req, res) => {
  try {
    const summary = await Attendance.aggregate([
      { $match: { studentId: req.userId } },
      {
        $group: {
          _id: "$classId",
          totalPresent: {
            $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] },
          },
          totalRecords: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "classes",
          localField: "_id",
          foreignField: "_id",
          as: "class",
        },
      },
      { $unwind: "$class" },
      {
        $project: {
          _id: 0,
          classId: "$_id",
          subject: "$class.subject",
          totalPresent: 1,
          totalRecords: 1,
          percentage: {
            $round: [
              { $multiply: [{ $divide: ["$totalPresent", "$totalRecords"] }, 100] },
              1,
            ],
          },
        },
      },
      { $sort: { subject: 1 } },
    ]);

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/student/classes
 * Returns all active classes (so student can browse).
 */
exports.getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find({ isActive: true })
      .populate("adminId", "name adminId")
      .sort({ subject: 1 });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
