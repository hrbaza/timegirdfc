const express = require("express");
const rateLimit = require("express-rate-limit");
const { body } = require("express-validator");
const { validate } = require("../middleware/validate");
const { protect } = require("../middleware/auth");
const auth = require("../controllers/authController");

const router = express.Router();

// Throttle auth endpoints against brute force (SRS §7.2).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "fail", message: "Too many attempts. Please try again later." },
});

router.post(
  "/register",
  authLimiter,
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  validate,
  auth.register
);

router.post(
  "/login",
  authLimiter,
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  validate,
  auth.login
);

router.post(
  "/admin/login",
  authLimiter,
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  validate,
  auth.adminLogin
);

// Password reset via email OTP.
router.post(
  "/forgot-password",
  authLimiter,
  [body("email").isEmail().withMessage("Valid email is required").normalizeEmail()],
  validate,
  auth.forgotPassword
);
router.post(
  "/verify-reset-otp",
  authLimiter,
  [body("email").isEmail().normalizeEmail(), body("otp").trim().notEmpty().withMessage("Code is required")],
  validate,
  auth.verifyResetOtp
);
router.post(
  "/reset-password",
  authLimiter,
  [
    body("email").isEmail().normalizeEmail(),
    body("otp").trim().notEmpty().withMessage("Code is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  validate,
  auth.resetPassword
);

router.get("/me", protect, auth.getMe);

// TEMPORARY email diagnostic — remove after debugging.
router.get("/mail-check", auth.mailCheck);

module.exports = router;
