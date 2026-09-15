const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { AppError, catchAsync } = require("../utils/AppError");

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// Require a valid JWT; attaches req.user.
const protect = catchAsync(async (req, res, next) => {
  let token;
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) token = auth.split(" ")[1];
  if (!token) return next(new AppError("You are not signed in. Please provide a token.", 401));

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  if (!user) return next(new AppError("The user for this token no longer exists.", 401));

  req.user = user;
  next();
});

// Restrict to given roles (use after protect).
const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError("You do not have permission to perform this action.", 403));
  }
  next();
};

// Optional auth: attaches req.user if a valid token is present, but never blocks.
const softAuth = catchAsync(async (req, res, next) => {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    } catch (e) { /* ignore invalid token for optional auth */ }
  }
  next();
});

module.exports = { signToken, protect, restrictTo, softAuth };
