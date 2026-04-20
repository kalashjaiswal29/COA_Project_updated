const mongoose = require("mongoose");

const AttendanceSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    // ISO date string of the class session date (no time), e.g. "2024-06-10"
    date: { type: String, required: true },
    status: {
      type: String,
      enum: ["Present", "Absent"],
      default: "Present",
    },
    markedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound unique index: one record per student per class per day
AttendanceSchema.index({ classId: 1, studentId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", AttendanceSchema);
