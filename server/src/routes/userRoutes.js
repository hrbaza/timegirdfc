const express = require("express");
const { crudFactory } = require("../controllers/crudFactory");
const { updateUser } = require("../controllers/userController");
const User = require("../models/User");
const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();
const c = crudFactory(User);

// User management is Admin-only (SRS FR-14 role-based access).
router.use(protect, restrictTo("Admin"));
router.route("/").get(c.getAll).post(c.createOne);
// Use updateUser (not the generic handler) so password changes are hashed.
router.route("/:id").get(c.getOne).put(updateUser).patch(updateUser).delete(c.deleteOne);

module.exports = router;
