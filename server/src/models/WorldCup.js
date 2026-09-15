const mongoose = require("mongoose");
const { baseSchemaOptions } = require("./_schemaOptions");
const { genId } = require("../utils/id");

const worldCupSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => genId("wc") },
    type: { type: String, enum: ["men", "women"], required: true },
    year: { type: Number, required: [true, "Year is required"] },
    host: { type: String, default: "" },
    champion: { type: String, default: "" },
    runnerUp: { type: String, default: "" },
  },
  baseSchemaOptions
);

worldCupSchema.index({ type: 1, year: -1 });

module.exports = mongoose.model("WorldCup", worldCupSchema);
