const { validationResult } = require("express-validator");
const { AppError } = require("../utils/AppError");

// Runs after express-validator chains; throws 400 with the first messages.
function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const msg = errors.array().map((e) => e.msg).join(", ");
  return next(new AppError(msg, 400));
}

module.exports = { validate };
