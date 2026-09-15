const express = require("express");
const cc = require("../controllers/commentController");
const { protect, restrictTo, softAuth } = require("../middleware/auth");

const router = express.Router();
const staff = [protect, restrictTo("Admin", "Editor")];

router.get("/post/:postId", softAuth, cc.getForPost); // approved (public) / all (staff + ?all=true)
router.get("/", ...staff, cc.list); // moderation list
router.post("/", protect, cc.create); // any signed-in user (FR-11)
router.patch("/:id/status", ...staff, cc.setStatus);
router.delete("/:id", ...staff, cc.remove);

module.exports = router;
