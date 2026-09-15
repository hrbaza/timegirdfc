const express = require("express");
const { crudFactory } = require("../controllers/crudFactory");
const User = require("../models/User");
const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();
const c = crudFactory(User);

// User management is Admin-only (SRS FR-14 role-based access).
router.use(protect, restrictTo("Admin"));
router.route("/").get(c.getAll).post(c.createOne);
router.route("/:id").get(c.getOne).put(c.updateOne).patch(c.updateOne).delete(c.deleteOne);

module.exports = router;
