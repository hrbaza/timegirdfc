const mongoose = require("mongoose");
const { baseSchemaOptions } = require("./_schemaOptions");
const { genId } = require("../utils/id");

const teamSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => genId("t") },
    name: { type: String, required: [true, "Team name is required"], trim: true },
    crest: { type: String, default: "" },
    founded: { type: Number },
    stadium: { type: String, default: "" },
    country: { type: String, ref: "Country" }, // country code
    league: { type: String, ref: "League", default: null },
    honors: { type: [String], default: [] },
  },
  baseSchemaOptions
);

teamSchema.index({ name: "text", stadium: "text" });

module.exports = mongoose.model("Team", teamSchema);
