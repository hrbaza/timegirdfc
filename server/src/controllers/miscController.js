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
const IMG = require("../../../assets/js/imgsrc.js"); // responsive image widths + URLs
const { NO_COVER } = require("../utils/slug");

// GET /api/search?q=  (FR-12: grouped global search)
const search = catchAsync(async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json({ status: "success", data: { players: [], teams: [], news: [], leagues: [] } });
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const [players, teams, news, leagues] = await Promise.all([
    Player.find({ $or: [{ name: rx }, { pos: rx }] }).limit(6),
    Team.find({ $or: [{ name: rx }, { stadium: rx }] }).limit(6),
    News.find(require("../utils/slug").publicNews({ $or: [{ title: rx }, { excerpt: rx }, { tags: rx }] }))
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
// opts.body: false drops the article body (it fills an empty excerpt first);
// opts.skip / opts.limit page the list.
async function leanNews(match, opts) {
  opts = opts || {};
  const notData = (f) => ({ $cond: [{ $regexMatch: { input: { $ifNull: ["$" + f, ""] }, regex: "^data:" } }, "", { $ifNull: ["$" + f, ""] }] });
  const has = (f) => ({ $ne: [{ $ifNull: ["$" + f, ""] }, ""] });
  const page = [];
  if (opts.skip) page.push({ $skip: opts.skip });
  if (opts.limit) page.push({ $limit: opts.limit });
  const rows = await News.aggregate([
    { $match: match || {} },
    { $sort: { publishedAt: -1 } },
    ...page,
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
    n.cover = NO_COVER[n._id] ? "" : n.coverExt || (n.hasCover ? `/api/media/news/${n._id}/cover` : "");
    n.bodyImage1 = n.hasBI1 ? `/api/media/news/${n._id}/bodyImage1` : "";
    n.bodyImage2 = n.hasBI2 ? `/api/media/news/${n._id}/bodyImage2` : "";
    delete n._id; delete n.coverExt; delete n.hasCover; delete n.hasBI1; delete n.hasBI2;
    if (opts.body === false) {
      if (!String(n.excerpt || "").trim()) {
        const t = String(n.body || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        n.excerpt = t.length > 160 ? t.slice(0, 159).trimEnd() + "…" : t;
      }
      delete n.body;
    }
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
// Only what the public pages use. Article bodies are left out (an article page
// loads its own body from /api/news/:id), and so is the data of the removed
// players / teams / leagues / awards / transfers / schedule sections.
const bootstrap = catchAsync(async (req, res) => {
  const [worldcups, news, videos, comments] = await Promise.all([
    WorldCup.find().sort("-year"),
    leanNews(require("../utils/slug").publicNews(), { body: false }),
    leanVideos(),
    Comment.find({ status: "approved" }).sort("-createdAt"),
  ]);
  // The CDN keeps it for a minute and refreshes it in the background, so a new
  // or edited post shows within about a minute; browsers always ask again.
  res.set("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=600");
  res.json({ status: "success", data: { worldcups, news, videos, comments } });
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
  if (col === "news" && field === "cover" && NO_COVER[id]) return res.status(404).end();
  const doc = await cfg.model.findById(id).select(field).lean();
  const val = doc && doc[field];
  if (!val) return res.status(404).end();
  // ?w=<width> asks for a resized WebP copy (only the widths in IMG.WIDTHS).
  const w = parseInt(req.query.w, 10);
  const width = IMG.WIDTHS.includes(w) ? w : 0;
  if (/^https?:\/\//i.test(val)) {
    res.set("Cache-Control", "public, max-age=86400");
    return res.redirect(302, width ? IMG.sized(val, width) : val);
  }
  const m = /^data:([^;]+);base64,([\s\S]*)$/.exec(val);
  if (!m) return res.status(404).end();
  const buf = Buffer.from(m[2], "base64");
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  const sharp = width && getSharp();
  if (sharp) {
    try {
      const out = await sharp(buf).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
      res.set("Content-Type", "image/webp");
      return res.send(out);
    } catch (e) { console.error("Image resize failed:", e.message); /* fall through to the original */ }
  }
  res.set("Content-Type", m[1] || "image/jpeg");
  res.send(buf);
});

// sharp is a native module: load it on first use, and if it cannot load,
// serve original images instead of failing.
let sharpLib;
function getSharp() {
  if (sharpLib === undefined) {
    try { sharpLib = require("sharp"); } catch (e) { console.error("sharp unavailable:", e.message); sharpLib = null; }
  }
  return sharpLib;
}

// GET /api/health
const health = (req, res) => res.json({ status: "success", message: "Time Grid FC API is running", time: new Date().toISOString() });

module.exports = { search, bootstrap, media, health, leanNews };
