const User = require("../models/User");
const { signToken } = require("../middleware/auth");
const { AppError, catchAsync } = require("../utils/AppError");

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

module.exports = { register, login, adminLogin, getMe };
