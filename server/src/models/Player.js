const mongoose = require("mongoose");
const { baseSchemaOptions } = require("./_schemaOptions");
const { genId } = require("../utils/id");

const careerSchema = new mongoose.Schema(
  { club: String, years: String },
  { _id: false }
);
const statSchema = new mongoose.Schema(
  { season: String, club: String, apps: Number, goals: Number, assists: Number },
  { _id: false }
);

const playerSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => genId("p") },
    name: { type: String, required: [true, "Player name is required"], trim: true },
    country: { type: String, ref: "Country" }, // country code
    pos: { type: String, enum: ["Goalkeeper", "Defender", "Midfielder", "Forward"], default: "Forward" },
    jersey: { type: Number },
    club: { type: String, ref: "Team", default: null },
    dob: { type: String }, // YYYY-MM-DD
    photo: { type: String, default: "" },
    career: { type: [careerSchema], default: [] },
    stats: { type: [statSchema], default: [] },
  },
  baseSchemaOptions
);

playerSchema.index({ name: "text" });
playerSchema.index({ country: 1 });

module.exports = mongoose.model("Player", playerSchema);
