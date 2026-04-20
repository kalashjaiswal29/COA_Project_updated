const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const Admin = require("../models/Admin");
const { cloudinary } = require("../utils/cloudinary");
const axios = require("axios");

const signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// ─── STUDENT ────────────────────────────────────────────────────────────────

exports.registerStudent = async (req, res) => {
  try {
    const { name, entryNumber, email, password, department, year } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Face image is required" });
    }

    const existing = await Student.findOne({
      $or: [{ entryNumber: entryNumber.toUpperCase() }, { email: email.toLowerCase() }],
    });
    if (existing) {
      // Clean up uploaded Cloudinary image (cloudinary v1 uses public_id = req.file.filename)
      if (req.file?.filename) {
        await cloudinary.uploader.destroy(req.file.filename);
      }
      return res.status(409).json({ message: "Student already registered with that Entry Number or Email" });
    }

    const student = await Student.create({
      name,
      entryNumber: entryNumber.toUpperCase(),
      email: email.toLowerCase(),
      password,
      department,
      year: Number(year),
      faceImageUrl: req.file.path,
      faceImagePublicId: req.file.filename,
    });

    // Notify Python CV service to refresh encoding cache
    try {
      await axios.post(`${process.env.PYTHON_CV_URL}/refresh`);
    } catch {
      // Non-fatal if CV service offline
    }

    const token = signToken(student._id, "student");
    res.status(201).json({ token, user: student, role: "student" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.loginStudent = async (req, res) => {
  try {
    const { entryNumber, password } = req.body;
    if (!entryNumber || !password) {
      return res.status(400).json({ message: "Entry number and password are required" });
    }

    const student = await Student.findOne({ entryNumber: entryNumber.toUpperCase() }).select("+password");
    if (!student || !(await student.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Reload without password field
    const safeStudent = await Student.findById(student._id);
    const token = signToken(student._id, "student");
    res.json({ token, user: safeStudent, role: "student" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── ADMIN ──────────────────────────────────────────────────────────────────

exports.registerAdmin = async (req, res) => {
  try {
    const { adminId, name, email, password, subjects } = req.body;

    const existing = await Admin.findOne({
      $or: [{ adminId: adminId.toUpperCase() }, { email: email.toLowerCase() }],
    });
    if (existing) {
      return res.status(409).json({ message: "Admin already registered with that ID or Email" });
    }

    const subjectsArr = Array.isArray(subjects)
      ? subjects
      : (subjects || "").split(",").map((s) => s.trim()).filter(Boolean);

    const admin = await Admin.create({
      adminId: adminId.toUpperCase(),
      name,
      email: email.toLowerCase(),
      password,
      subjects: subjectsArr,
    });

    const token = signToken(admin._id, "admin");
    res.status(201).json({ token, user: admin, role: "admin" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.loginAdmin = async (req, res) => {
  try {
    const { adminId, password } = req.body;
    if (!adminId || !password) {
      return res.status(400).json({ message: "Admin ID and password are required" });
    }

    const admin = await Admin.findOne({ adminId: adminId.toUpperCase() }).select("+password");
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const safeAdmin = await Admin.findById(admin._id);
    const token = signToken(admin._id, "admin");
    res.json({ token, user: safeAdmin, role: "admin" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── SHARED ─────────────────────────────────────────────────────────────────

exports.getMe = async (req, res) => {
  try {
    let user;
    if (req.userRole === "admin") {
      user = await Admin.findById(req.userId);
    } else {
      user = await Student.findById(req.userId);
    }
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user, role: req.userRole });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
