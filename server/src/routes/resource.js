const express = require("express");
const { crudFactory } = require("../controllers/crudFactory");
const { protect, restrictTo } = require("../middleware/auth");

// Standard REST resource: public reads, staff-only writes.
function makeResourceRouter(Model) {
  const c = crudFactory(Model);
  const router = express.Router();
  const staff = [protect, restrictTo("Admin", "Editor")];

  router.route("/").get(c.getAll).post(...staff, c.createOne);
  router
    .route("/:id")
    .get(c.getOne)
    .put(...staff, c.updateOne)
    .patch(...staff, c.updateOne)
    .delete(...staff, c.deleteOne);

  return router;
}

module.exports = { makeResourceRouter };
