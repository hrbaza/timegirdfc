const Player = require("../models/Player");
const Team = require("../models/Team");
const News = require("../models/News");
const League = require("../models/League");
const Country = require("../models/Country");
const WorldCup = require("../models/WorldCup");
const Award = require("../models/Award");
const Fixture = require("../models/Fixture");
const Transfer = require("../models/Transfer");
const Video = require("../models/Video");
const Comment = require("../models/Comment");
const { catchAsync, AppError } = require("../utils/AppError");

// GET /api/search?q=  (FR-12: grouped global search)
const search = catchAsync(async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json({ status: "success", data: { players: [], teams: [], news: [], leagues: [] } });
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const [players, teams, news, leagues] = await Promise.all([
    Player.find({ $or: [{ name: rx }, { pos: rx }] }).limit(6),
    Team.find({ $or: [{ name: rx }, { stadium: rx }] }).limit(6),
    News.find({ status: "published", $or: [{ title: rx }, { excerpt: rx }, { tags: rx }] })
      .select("-cover -bodyImage1 -bodyImage2 -body").limit(6),
    League.find({ $or: [{ name: rx }, { country: rx }] }).limit(6),
  ]);
  res.json({ status: "success", data: { players, teams, news, leagues } });
});

/* ---------------------------------------------------------------------------
   Image fields (cover / in-article images / video thumbnails) are stored in
   Mongo as base64 data URLs. Sending them inside JSON bloated /api/bootstrap to
   ~10 MB. Instead we project only *whether* each image exists (no base64 leaves
   Mongo) and return a lightweight /api/media/... URL; the image itself is
   served (and CDN-cached) by the media endpoint below.
   --------------------------------------------------------------------------- */

// Build a news-list aggregation that excludes base64 blobs but keeps everything
// the SPA needs, with image fields turned into media URLs.
async function leanNews(match) {
  const notData = (f) => ({ $cond: [{ $regexMatch: { input: { $ifNull: ["$" + f, ""] }, regex: "^data:" } }, "", { $ifNull: ["$" + f, ""] }] });
  const has = (f) => ({ $ne: [{ $ifNull: ["$" + f, ""] }, ""] });
  const rows = await News.aggregate([
    { $match: match || {} },
    { $sort: { publishedAt: -1 } },
    { $project: {
        title: 1, slug: 1, category: 1, author: 1, tags: 1, excerpt: 1, body: 1,
        metaDescription: 1, keywords: 1, status: 1, publishedAt: 1, updatedAt: 1, createdAt: 1,
        bodyImage1Caption: 1, bodyImage2Caption: 1,
        coverExt: notData("cover"), hasCover: has("cover"),
        hasBI1: has("bodyImage1"), hasBI2: has("bodyImage2"),
    } },
  ]);
  rows.forEach((n) => {
    n.id = n._id;
    n.cover = n.coverExt || (n.hasCover ? `/api/media/news/${n._id}/cover` : "");
    n.bodyImage1 = n.hasBI1 ? `/api/media/news/${n._id}/bodyImage1` : "";
    n.bodyImage2 = n.hasBI2 ? `/api/media/news/${n._id}/bodyImage2` : "";
    delete n._id; delete n.coverExt; delete n.hasCover; delete n.hasBI1; delete n.hasBI2;
  });
  return rows;
}

async function leanVideos() {
  const rows = await Video.aggregate([
    { $sort: { addedAt: -1 } },
    { $project: {
        title: 1, url: 1, category: 1, desc: 1, addedAt: 1,
        thumbExt: { $cond: [{ $regexMatch: { input: { $ifNull: ["$thumb", ""] }, regex: "^data:" } }, "", { $ifNull: ["$thumb", ""] }] },
        hasThumb: { $ne: [{ $ifNull: ["$thumb", ""] }, ""] },
    } },
  ]);
  rows.forEach((v) => {
    v.id = v._id;
    v.thumb = v.thumbExt || (v.hasThumb ? `/api/media/videos/${v._id}/thumb` : "");
    delete v._id; delete v.thumbExt; delete v.hasThumb;
  });
  return rows;
}

// GET /api/bootstrap  (one lightweight payload of all PUBLIC data for the SPA cache)
const bootstrap = catchAsync(async (req, res) => {
  const [countries, teams, players, leagues, worldcups, awards, fixtures, news, transfers, videos, comments] =
    await Promise.all([
      Country.find().sort("name"),
      Team.find().sort("name"),
      Player.find().sort("name"),
      League.find(),
      WorldCup.find().sort("-year"),
      Award.find(),
      Fixture.find().sort("date time"),
      leanNews({ status: "published" }),
      Transfer.find().sort("-date"),
      leanVideos(),
      Comment.find({ status: "approved" }).sort("-createdAt"),
    ]);
  // Article lists must always be fresh — never served stale by CDN/browser.
  res.set("Cache-Control", "no-store");
  res.json({
    status: "success",
    data: { countries, teams, players, leagues, worldcups, awards, fixtures, news, transfers, videos, comments },
  });
});

// GET /api/media/:col/:id/:field  — serve a stored image (base64 → bytes, or
// redirect for external URLs). Heavily cached so the CDN/browser reuse it.
const MEDIA = {
  news: { model: News, fields: ["cover", "bodyImage1", "bodyImage2"] },
  videos: { model: Video, fields: ["thumb"] },
};
const media = catchAsync(async (req, res, next) => {
  const { col, id, field } = req.params;
  const cfg = MEDIA[col];
  if (!cfg || !cfg.fields.includes(field)) return next(new AppError("Media not found.", 404));
  const doc = await cfg.model.findById(id).select(field).lean();
  const val = doc && doc[field];
  if (!val) return res.status(404).end();
  if (/^https?:\/\//i.test(val)) {
    res.set("Cache-Control", "public, max-age=86400");
    return res.redirect(302, val);
  }
  const m = /^data:([^;]+);base64,([\s\S]*)$/.exec(val);
  if (!m) return res.status(404).end();
  res.set("Content-Type", m[1] || "image/jpeg");
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  res.send(Buffer.from(m[2], "base64"));
});

// GET /api/health
const health = (req, res) => res.json({ status: "success", message: "Time Grid FC API is running", time: new Date().toISOString() });

module.exports = { search, bootstrap, media, health, leanNews };
