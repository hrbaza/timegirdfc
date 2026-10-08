const News = require("../models/News");
const { AppError, catchAsync } = require("../utils/AppError");

// Base64 images stay in Mongo but never travel in JSON — expose them as
// lightweight /api/media/... URLs (external URLs pass through unchanged).
function toMediaUrls(doc) {
  const o = doc.toJSON ? doc.toJSON() : doc;
  ["cover", "bodyImage1", "bodyImage2"].forEach((f) => {
    if (o[f] && /^data:/i.test(o[f])) o[f] = `/api/media/news/${o.id || o._id}/${f}`;
  });
  return o;
}

// GET /api/news  (public: published only, category filter, pagination)
const getPublished = catchAsync(async (req, res) => {
  const filter = { status: "published" };
  if (req.query.category && req.query.category !== "All") filter.category = req.query.category;

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 9);

  const [data, total] = await Promise.all([
    News.find(filter).sort("-publishedAt").skip((page - 1) * limit).limit(limit),
    News.countDocuments(filter),
  ]);
  res.json({ status: "success", results: data.length, total, page, pages: Math.ceil(total / limit), data });
});

// GET /api/news/manage  (admin: everything incl. drafts)
const getAllAdmin = catchAsync(async (req, res) => {
  const data = await News.find().sort("-publishedAt");
  res.json({ status: "success", results: data.length, data });
});

// GET /api/news/:id  (public; drafts hidden unless requester is admin/editor)
const getOne = catchAsync(async (req, res, next) => {
  const doc = await News.findById(req.params.id);
  if (!doc) return next(new AppError("Article not found.", 404));
  const isStaff = req.user && (req.user.role === "Admin" || req.user.role === "Editor");
  if (doc.status !== "published" && !isStaff) return next(new AppError("Article not found.", 404));
  res.json({ status: "success", data: isStaff ? doc : toMediaUrls(doc) });
});

module.exports = { getPublished, getAllAdmin, getOne };
