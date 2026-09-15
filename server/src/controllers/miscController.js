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
const mongoose = require("mongoose");
const { catchAsync } = require("../utils/AppError");

// GET /api/search?q=  (FR-12: grouped global search)
const search = catchAsync(async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json({ status: "success", data: { players: [], teams: [], news: [], leagues: [] } });
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const [players, teams, news, leagues] = await Promise.all([
    Player.find({ $or: [{ name: rx }, { pos: rx }] }).limit(6),
    Team.find({ $or: [{ name: rx }, { stadium: rx }] }).limit(6),
    News.find({ status: "published", $or: [{ title: rx }, { excerpt: rx }, { tags: rx }] }).limit(6),
    League.find({ $or: [{ name: rx }, { country: rx }] }).limit(6),
  ]);
  res.json({ status: "success", data: { players, teams, news, leagues } });
});

// GET /api/bootstrap  (one payload of all PUBLIC data — handy for the SPA cache)
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
      News.find({ status: "published" }).sort("-publishedAt"),
      Transfer.find().sort("-date"),
      Video.find().sort("-addedAt"),
      Comment.find({ status: "approved" }).sort("-createdAt"), // public approved comments
    ]);
  res.json({
    status: "success",
    data: { countries, teams, players, leagues, worldcups, awards, fixtures, news, transfers, videos, comments },
  });
});

// GET /api/health
const health = (req, res) => res.json({
  status: "success",
  message: "Time Grid FC API is running",
  time: new Date().toISOString(),
  hasMongoUri: !!process.env.MONGO_URI,          // is the env var present?
  dbState: mongoose.connection.readyState,        // 0=disconnected 1=connected 2=connecting 3=disconnecting
  dbError: global.__dbError || null,              // last connection error (no secrets)
});

module.exports = { search, bootstrap, health };
