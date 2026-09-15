const express = require("express");
const { makeResourceRouter } = require("./resource");
const misc = require("../controllers/miscController");

const Team = require("../models/Team");
const Country = require("../models/Country");
const League = require("../models/League");
const WorldCup = require("../models/WorldCup");
const Award = require("../models/Award");
const Fixture = require("../models/Fixture");
const Transfer = require("../models/Transfer");
const Video = require("../models/Video");

const router = express.Router();

// Health & utility
router.get("/health", misc.health);
router.get("/search", misc.search);
router.get("/bootstrap", misc.bootstrap);

// Auth & custom resources
router.use("/auth", require("./authRoutes"));
router.use("/users", require("./userRoutes"));
router.use("/players", require("./playerRoutes"));
router.use("/news", require("./newsRoutes"));
router.use("/comments", require("./commentRoutes"));

// Standard resources (public read, staff write)
router.use("/teams", makeResourceRouter(Team));
router.use("/countries", makeResourceRouter(Country));
router.use("/leagues", makeResourceRouter(League));
router.use("/worldcups", makeResourceRouter(WorldCup));
router.use("/awards", makeResourceRouter(Award));
router.use("/fixtures", makeResourceRouter(Fixture));
router.use("/transfers", makeResourceRouter(Transfer));
router.use("/videos", makeResourceRouter(Video));

module.exports = router;
