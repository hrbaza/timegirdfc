const mongoose = require("mongoose");
const { baseSchemaOptions } = require("./_schemaOptions");
const { genId } = require("../utils/id");

const fixtureSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => genId("f") },
    home: { type: String, ref: "Team", required: true },
    away: { type: String, ref: "Team", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, default: "" },
    venue: { type: String, default: "" },
    comp: { type: String, ref: "League", default: null },
    status: { type: String, enum: ["upcoming", "live", "finished"], default: "upcoming" },
    hs: { type: Number, default: null },
    as: { type: Number, default: null },
  },
  baseSchemaOptions
);

fixtureSchema.index({ date: 1, time: 1 });

module.exports = mongoose.model("Fixture", fixtureSchema);
