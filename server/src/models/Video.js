const mongoose = require("mongoose");
const { baseSchemaOptions } = require("./_schemaOptions");
const { genId } = require("../utils/id");

const videoSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => genId("v") },
    title: { type: String, required: [true, "Title is required"], trim: true },
    category: { type: String, enum: ["Match Analysis", "Player Analysis", "News"], default: "Match Analysis" },
    url: { type: String, required: [true, "YouTube URL is required"] },
    thumb: { type: String, default: "" },
    desc: { type: String, default: "" },
    addedAt: { type: Date, default: Date.now },
  },
  baseSchemaOptions
);

videoSchema.index({ addedAt: -1 });

module.exports = mongoose.model("Video", videoSchema);
