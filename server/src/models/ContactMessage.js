const mongoose = require("mongoose");
const { baseSchemaOptions } = require("./_schemaOptions");
const { genId } = require("../utils/id");

// Messages sent through the public contact form. Kept even when the email to
// the team could not be sent, so nothing is lost.
const contactMessageSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => genId("m") },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    topic: { type: String, trim: true, maxlength: 40, default: "General" },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    emailed: { type: Boolean, default: false },
  },
  baseSchemaOptions // provides createdAt / updatedAt
);

module.exports = mongoose.model("ContactMessage", contactMessageSchema);
