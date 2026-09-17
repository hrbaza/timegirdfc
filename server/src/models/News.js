const mongoose = require("mongoose");
const { baseSchemaOptions } = require("./_schemaOptions");
const { genId } = require("../utils/id");

const slugify = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const newsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => genId("n") },
    title: { type: String, required: [true, "Title is required"], trim: true },
    slug: { type: String, unique: true, sparse: true },
    category: {
      type: String,
      enum: [
        "Match Analysis",
        "Player Analysis",
        "Transfer News",
        "General Football News",
        "World Cup News",
      ],
      default: "General Football News",
    },
    cover: { type: String, default: "" },
    bodyImage1: { type: String, default: "" },         // first in-article image (≈ 1/3 down)
    bodyImage1Caption: { type: String, default: "" },
    bodyImage2: { type: String, default: "" },         // second in-article image (≈ 2/3 down)
    bodyImage2Caption: { type: String, default: "" },
    author: { type: String, default: "Time Grid FC" },
    tags: { type: [String], default: [] },
    excerpt: { type: String, default: "" },
    body: { type: String, default: "" },
    metaDescription: { type: String, default: "" }, // SEO meta description
    keywords: { type: [String], default: [] },       // SEO keywords
    status: { type: String, enum: ["published", "draft"], default: "published" },
    publishedAt: { type: Date, default: Date.now },
  },
  baseSchemaOptions
);

newsSchema.pre("validate", function (next) {
  if (!this.slug && this.title) this.slug = slugify(this.title) + "-" + this._id.slice(-4);
  next();
});

newsSchema.index({ title: "text", excerpt: "text", tags: "text" });
newsSchema.index({ status: 1, publishedAt: -1 });

module.exports = mongoose.model("News", newsSchema);
