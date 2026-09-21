const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { baseSchemaOptions } = require("./_schemaOptions");
const { genId } = require("../utils/id");

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => genId("u") },
    name: { type: String, required: [true, "Name is required"], trim: true },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // never returned by default
    },
    role: {
      type: String,
      enum: ["Visitor", "Editor", "Admin"],
      default: "Visitor",
    },
    // Password-reset OTP (hashed; never returned by default).
    resetOtp: { type: String, select: false },
    resetOtpExpires: { type: Date, select: false },
    resetOtpAttempts: { type: Number, default: 0, select: false },
  },
  baseSchemaOptions
);

// Hash password on create / password change (runs on .save() and .create()).
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);
