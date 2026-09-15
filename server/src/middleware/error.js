const { AppError } = require("../utils/AppError");

function notFound(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  // Mongoose: bad ObjectId / cast
  if (err.name === "CastError") error = new AppError(`Invalid ${err.path}: ${err.value}`, 400);
  // Mongoose: duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    error = new AppError(`Duplicate value for ${field}: already exists.`, 409);
  }
  // Mongoose: validation
  if (err.name === "ValidationError") {
    const msg = Object.values(err.errors).map((e) => e.message).join(", ");
    error = new AppError(msg, 400);
  }
  // JWT
  if (err.name === "JsonWebTokenError") error = new AppError("Invalid token. Please sign in again.", 401);
  if (err.name === "TokenExpiredError") error = new AppError("Session expired. Please sign in again.", 401);

  const statusCode = error.statusCode || 500;
  const payload = { status: error.status || "error", message: error.message || "Something went wrong" };
  if (process.env.NODE_ENV === "development" && !error.isOperational) payload.stack = err.stack;

  res.status(statusCode).json(payload);
}

module.exports = { notFound, errorHandler };
