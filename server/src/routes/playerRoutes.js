const express = require("express");
const { crudFactory } = require("../controllers/crudFactory");
const pc = require("../controllers/playerController");
const Player = require("../models/Player");
const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();
const c = crudFactory(Player);
const staff = [protect, restrictTo("Admin", "Editor")];

router.get("/countries/summary", pc.countrySummary);
router.get("/country/:code", pc.getByCountry);

router.route("/").get(c.getAll).post(...staff, c.createOne);
router
  .route("/:id")
  .get(pc.getOneWithAwards)
  .put(...staff, c.updateOne)
  .patch(...staff, c.updateOne)
  .delete(...staff, c.deleteOne);

module.exports = router;
