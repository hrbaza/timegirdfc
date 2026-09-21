const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { signToken } = require("../middleware/auth");
const { AppError, catchAsync } = require("../utils/AppError");
const { sendMail, verify: verifyMail } = require("../utils/mailer");

const OTP_TTL_MIN = 10;      // code expires after 10 minutes
const OTP_MAX_ATTEMPTS = 5;  // wrong-code attempts before a new code is required

function sendAuth(res, user, status) {
  const token = signToken(user._id);
  const safe = user.toJSON();
  delete safe.password;
  res.status(status || 200).json({ status: "success", token, data: safe });
}

// POST /api/auth/register  (visitors only — role cannot be self-assigned)
const register = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;
  const exists = await User.findOne({ email: (email || "").toLowerCase() });
  if (exists) return next(new AppError("An account with this email already exists.", 409));
  const user = await User.create({ name, email, password, role: "Visitor" });
  sendAuth(res, user, 201);
});

// POST /api/auth/login  (any user)
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return next(new AppError("Email and password are required.", 400));
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    return next(new AppError("Invalid email or password.", 401));
  }
  sendAuth(res, user, 200);
});

// POST /api/auth/admin/login  (requires Admin/Editor)
const adminLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return next(new AppError("Email and password are required.", 400));
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    return next(new AppError("Invalid credentials.", 401));
  }
  if (user.role !== "Admin" && user.role !== "Editor") {
    return next(new AppError("This account does not have admin access.", 403));
  }
  sendAuth(res, user, 200);
});

// GET /api/auth/me
const getMe = catchAsync(async (req, res) => {
  res.json({ status: "success", data: req.user });
});

/* ---------------- Password reset via email OTP ---------------- */
function genOtp() { return String(crypto.randomInt(0, 1000000)).padStart(6, "0"); }

// Validate an OTP against a user (throws AppError on any failure; counts attempts).
async function assertOtp(user, otp) {
  if (!user || !user.resetOtp || !user.resetOtpExpires) {
    throw new AppError("No reset request found. Please request a new code.", 400);
  }
  if (user.resetOtpExpires.getTime() < Date.now()) {
    throw new AppError("This code has expired. Please request a new one.", 400);
  }
  if ((user.resetOtpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
    throw new AppError("Too many attempts. Please request a new code.", 429);
  }
  const ok = await bcrypt.compare(String(otp || ""), user.resetOtp);
  if (!ok) {
    user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
    await user.save({ validateBeforeSave: false });
    throw new AppError("Incorrect code. Please try again.", 400);
  }
}

// POST /api/auth/forgot-password  { email }
const forgotPassword = catchAsync(async (req, res) => {
  const email = (req.body.email || "").toLowerCase().trim();
  // Always respond the same way so we never reveal which emails are registered.
  const generic = { status: "success", message: "If an account exists for that email, a reset code has been sent." };
  if (!email) return res.json(generic);

  const user = await User.findOne({ email });
  if (!user) return res.json(generic);

  const otp = genOtp();
  user.resetOtp = await bcrypt.hash(otp, 10);
  user.resetOtpExpires = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);
  user.resetOtpAttempts = 0;
  await user.save({ validateBeforeSave: false });

  const subject = "Your Time Grid FC password reset code";
  const text = `Hi ${user.name},\n\nYour password reset code is: ${otp}\n\nIt expires in ${OTP_TTL_MIN} minutes. If you did not request this, you can safely ignore this email.\n\n— Time Grid FC`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#16a34a">Time Grid FC — Password reset</h2>
      <p>Hi ${user.name},</p>
      <p>Your password reset code is:</p>
      <p style="font-size:30px;font-weight:800;letter-spacing:6px;background:#f1f5f9;padding:14px 20px;border-radius:10px;text-align:center">${otp}</p>
      <p>This code expires in <b>${OTP_TTL_MIN} minutes</b>. If you did not request this, you can safely ignore this email.</p>
      <p style="color:#64748b;font-size:13px">— Time Grid FC</p>
    </div>`;

  let info = { dev: false };
  try { info = await sendMail({ to: email, subject, text, html }); }
  catch (e) { console.error("reset email failed:", e.message); }

  // In development with no SMTP configured, surface the code so the flow is
  // testable. NODE_ENV is "production" on Vercel, so this never leaks live.
  if (info.dev && process.env.NODE_ENV !== "production") {
    return res.json({ ...generic, devOtp: otp });
  }
  res.json(generic);
});

// POST /api/auth/verify-reset-otp  { email, otp }  → confirms the code (does not consume it)
const verifyResetOtp = catchAsync(async (req, res) => {
  const email = (req.body.email || "").toLowerCase().trim();
  const user = await User.findOne({ email }).select("+resetOtp +resetOtpExpires +resetOtpAttempts");
  await assertOtp(user, req.body.otp);
  res.json({ status: "success", valid: true });
});

// POST /api/auth/reset-password  { email, otp, password }  → sets the new password + signs in
const resetPassword = catchAsync(async (req, res, next) => {
  const email = (req.body.email || "").toLowerCase().trim();
  const { password } = req.body;
  if (!password || String(password).length < 6) {
    return next(new AppError("Password must be at least 6 characters.", 400));
  }
  const user = await User.findOne({ email }).select("+resetOtp +resetOtpExpires +resetOtpAttempts +password");
  await assertOtp(user, req.body.otp);
  user.password = password;                 // pre-save hook re-hashes
  user.resetOtp = undefined;
  user.resetOtpExpires = undefined;
  user.resetOtpAttempts = 0;
  await user.save();
  sendAuth(res, user, 200);                 // auto sign-in after reset
});

// GET /api/auth/mail-check  — TEMPORARY diagnostic (no secrets exposed).
const mailCheck = catchAsync(async (req, res) => {
  const status = {
    nodeEnv: process.env.NODE_ENV || null,
    hasHost: !!process.env.SMTP_HOST,
    host: process.env.SMTP_HOST || null,
    port: process.env.SMTP_PORT || null,
    hasUser: !!process.env.SMTP_USER,
    userPreview: process.env.SMTP_USER ? process.env.SMTP_USER.replace(/(.{2}).*(@.*)/, "$1***$2") : null,
    hasPass: !!process.env.SMTP_PASS,
    passLength: process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0,
    from: process.env.MAIL_FROM || null,
    smtp: await verifyMail(),
  };
  res.json(status);
});

module.exports = { register, login, adminLogin, getMe, forgotPassword, verifyResetOtp, resetPassword, mailCheck };
