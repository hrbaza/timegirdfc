const mongoose = require("mongoose");
const { baseSchemaOptions } = require("./_schemaOptions");
const { genId } = require("../utils/id");

const winnerSchema = new mongoose.Schema(
  {
    year: Number,
    player: { type: String, ref: "Player", default: null }, // player id (optional link)
    playerName: String,
    club: String,
  },
  { _id: false }
);

const awardSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => genId("a") },
    name: { type: String, required: [true, "Award name is required"], trim: true },
    icon: { type: String, default: "🏆" },
    desc: { type: String, default: "" },
    winners: { type: [winnerSchema], default: [] }, // newest first
  },
  baseSchemaOptions
);

module.exports = mongoose.model("Award", awardSchema);
