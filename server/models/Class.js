const mongoose = require("mongoose");

const ClassSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    // Days of week: ["Monday","Wednesday","Friday"]
    days: [{ type: String, required: true }],
    // "HH:MM" 24-hour format, e.g. "09:30"
    startTime: { type: String, required: true },
    // Duration in minutes, e.g. 60
    duration: { type: Number, required: true, min: 10 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Class", ClassSchema);
