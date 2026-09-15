const mongoose = require("mongoose");
const { baseSchemaOptions } = require("./_schemaOptions");
const { genId } = require("../utils/id");

const transferSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => genId("tr") },
    player: { type: String, ref: "Player", default: null }, // optional link
    playerName: { type: String, required: [true, "Player name is required"] },
    from: { type: String, default: "" },
    to: { type: String, default: "" },
    type: { type: String, enum: ["Permanent", "Loan"], default: "Permanent" },
    fee: { type: String, default: "" },
    date: { type: Date, default: Date.now },
  },
  baseSchemaOptions
);

transferSchema.index({ date: -1 });

module.exports = mongoose.model("Transfer", transferSchema);
