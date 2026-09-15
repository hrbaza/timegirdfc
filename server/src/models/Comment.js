const mongoose = require("mongoose");
const { baseSchemaOptions } = require("./_schemaOptions");
const { genId } = require("../utils/id");

const commentSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => genId("c") },
    postId: { type: String, ref: "News", required: true },
    userId: { type: String, ref: "User", required: true },
    author: { type: String, required: true },
    text: { type: String, required: [true, "Comment text is required"], trim: true, maxlength: 2000 },
    status: { type: String, enum: ["approved", "pending", "flagged"], default: "approved" },
  },
  baseSchemaOptions // provides createdAt / updatedAt
);

commentSchema.index({ postId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Comment", commentSchema);
