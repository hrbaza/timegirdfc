const mongoose = require("mongoose");
const { baseSchemaOptions } = require("./_schemaOptions");

const countrySchema = new mongoose.Schema(
  {
    _id: { type: String }, // = uppercase country code, e.g. "AR"
    code: { type: String, required: true, uppercase: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    flag: { type: String, default: "" }, // emoji (frontend also renders flag images by code)
  },
  baseSchemaOptions
);

countrySchema.pre("validate", function (next) {
  if (!this._id && this.code) this._id = this.code.toUpperCase();
  next();
});

module.exports = mongoose.model("Country", countrySchema);
