const express = require("express");
const router = express.Router();
const { upload } = require("../utils/cloudinary");
const {
  registerStudent,
  loginStudent,
  registerAdmin,
  loginAdmin,
  getMe,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Student auth
router.post("/student/register", upload.single("faceImage"), registerStudent);
router.post("/student/login", loginStudent);

// Admin auth
router.post("/admin/register", registerAdmin);
router.post("/admin/login", loginAdmin);

// Shared — get current user info
router.get("/me", protect, getMe);

module.exports = router;
