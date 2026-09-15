const Player = require("../models/Player");
const Award = require("../models/Award");
const { catchAsync, AppError } = require("../utils/AppError");

// GET /api/players/country/:code
const getByCountry = catchAsync(async (req, res) => {
  const data = await Player.find({ country: req.params.code.toUpperCase() }).sort("name");
  res.json({ status: "success", results: data.length, data });
});

// GET /api/players/countries/summary  → countries with player counts
const countrySummary = catchAsync(async (req, res) => {
  const rows = await Player.aggregate([
    { $group: { _id: "$country", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);
  res.json({ status: "success", data: rows.map((r) => ({ code: r._id, count: r.count })) });
});

// GET /api/players/:id  (+ derived honours from awards)
const getOneWithAwards = catchAsync(async (req, res, next) => {
  const player = await Player.findById(req.params.id);
  if (!player) return next(new AppError("Player not found.", 404));
  const awards = await Award.find({ "winners.player": player._id });
  const honours = [];
  awards.forEach((a) =>
    a.winners
      .filter((w) => w.player === player._id)
      .forEach((w) => honours.push({ award: a.name, icon: a.icon, awardId: a._id, year: w.year, club: w.club }))
  );
  honours.sort((x, y) => y.year - x.year);
  res.json({ status: "success", data: { ...player.toJSON(), honours } });
});

module.exports = { getByCountry, countrySummary, getOneWithAwards };
