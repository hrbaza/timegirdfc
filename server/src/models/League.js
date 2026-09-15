const mongoose = require("mongoose");
const { baseSchemaOptions } = require("./_schemaOptions");
const { genId } = require("../utils/id");

const championSchema = new mongoose.Schema(
  { season: String, team: String },
  { _id: false }
);

const leagueSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => genId("l") },
    name: { type: String, required: [true, "League name is required"], trim: true },
    country: { type: String, default: "" },
    flag: { type: String, default: "🏆" },
    type: {
      type: String,
      enum: ["Domestic League", "Domestic Cup", "Continental Cup", "International"],
      default: "Domestic League",
    },
    champions: { type: [championSchema], default: [] }, // newest first
  },
  baseSchemaOptions
);

module.exports = mongoose.model("League", leagueSchema);
