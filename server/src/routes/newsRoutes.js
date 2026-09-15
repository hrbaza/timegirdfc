const express = require("express");
const { crudFactory } = require("../controllers/crudFactory");
const nc = require("../controllers/newsController");
const News = require("../models/News");
const { protect, restrictTo, softAuth } = require("../middleware/auth");

const router = express.Router();
const c = crudFactory(News);
const staff = [protect, restrictTo("Admin", "Editor")];

router.get("/manage", ...staff, nc.getAllAdmin); // all incl. drafts
router.route("/").get(nc.getPublished).post(...staff, c.createOne);
router
  .route("/:id")
  .get(softAuth, nc.getOne) // drafts hidden unless staff
  .put(...staff, c.updateOne)
  .patch(...staff, c.updateOne)
  .delete(...staff, c.deleteOne);

module.exports = router;
