const Comment = require("../models/Comment");
const { AppError, catchAsync } = require("../utils/AppError");

// GET /api/comments/post/:postId  (public: approved; ?all=true + staff: everything)
const getForPost = catchAsync(async (req, res) => {
  const isStaff = req.user && (req.user.role === "Admin" || req.user.role === "Editor");
  const filter = { postId: req.params.postId };
  if (!(req.query.all === "true" && isStaff)) filter.status = "approved";
  const data = await Comment.find(filter).sort("-createdAt");
  res.json({ status: "success", results: data.length, data });
});

// GET /api/comments  (staff: optional ?status= filter, for moderation)
const list = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const data = await Comment.find(filter).sort("-createdAt");
  res.json({ status: "success", results: data.length, data });
});

// POST /api/comments  (auth required) { postId, text }
const create = catchAsync(async (req, res, next) => {
  const { postId, text } = req.body;
  if (!postId || !text || !text.trim()) return next(new AppError("postId and text are required.", 400));
  const comment = await Comment.create({
    postId,
    text: text.trim(),
    userId: req.user._id,
    author: req.user.name,
    status: "approved",
  });
  res.status(201).json({ status: "success", data: comment });
});

// PATCH /api/comments/:id/status  (staff) { status }
const setStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  if (!["approved", "pending", "flagged"].includes(status)) {
    return next(new AppError("Invalid status.", 400));
  }
  const doc = await Comment.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!doc) return next(new AppError("Comment not found.", 404));
  res.json({ status: "success", data: doc });
});

// DELETE /api/comments/:id  (staff)
const remove = catchAsync(async (req, res, next) => {
  const doc = await Comment.findByIdAndDelete(req.params.id);
  if (!doc) return next(new AppError("Comment not found.", 404));
  res.status(204).send();
});

module.exports = { getForPost, list, create, setStatus, remove };
