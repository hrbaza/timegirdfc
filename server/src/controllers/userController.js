const User = require("../models/User");
const { AppError, catchAsync } = require("../utils/AppError");

// Update a user. If `password` is provided, it is hashed via the model's
// pre-save hook (findByIdAndUpdate would NOT hash it). Empty password = keep.
const updateUser = catchAsync(async (req, res, next) => {
  const { password, pass, _password, ...rest } = req.body; // never accept a raw hash
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError("User not found.", 404));

  if (rest.name !== undefined) user.name = rest.name;
  if (rest.email !== undefined) user.email = String(rest.email).toLowerCase();
  if (rest.role !== undefined) user.role = rest.role;

  const newPass = password || _password;
  if (newPass) {
    if (String(newPass).length < 6) return next(new AppError("Password must be at least 6 characters.", 400));
    user.password = newPass; // pre-save hook hashes it
  }

  await user.save();
  res.json({ status: "success", data: user });
});

module.exports = { updateUser };
