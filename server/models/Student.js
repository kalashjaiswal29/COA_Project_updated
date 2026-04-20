const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const StudentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    entryNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    department: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1, max: 5 },
    faceImageUrl: { type: String, required: true },   // Cloudinary URL
    faceImagePublicId: { type: String },              // Cloudinary public_id
  },
  { timestamps: true }
);

// Hash password before saving
StudentSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

StudentSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Never expose password in JSON responses
StudentSchema.set("toJSON", {
  transform: (_, ret) => {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model("Student", StudentSchema);
