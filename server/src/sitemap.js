/* =========================================================================
   Time Grid FC — dynamic sitemap.xml
   Built from the database so every published article is listed with a fresh <lastmod>. Resilient: if the DB is unavailable
   it still returns a valid sitemap of the static section pages.
   ========================================================================= */
const News = require("./models/News");

const BASE = "https://www.timegridfc.com";

// Static section pages: [path, changefreq, priority]
const STATIC = [
  ["/", "daily", "1.0"],
  ["/news", "daily", "0.9"],
  ["/worldcup", "monthly", "0.7"],
  ["/videos", "weekly", "0.7"],
  ["/about", "yearly", "0.5"],
  ["/contact", "yearly", "0.5"],
  ["/privacy", "yearly", "0.3"],
  ["/terms", "yearly", "0.3"],
];

function xmlEsc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function isoDate(d) { try { return new Date(d).toISOString().slice(0, 10); } catch (e) { return undefined; } }

function urlEntry(loc, opts) {
  opts = opts || {};
  let s = `  <url><loc>${xmlEsc(BASE + loc)}</loc>`;
  if (opts.lastmod) s += `<lastmod>${opts.lastmod}</lastmod>`;
  if (opts.changefreq) s += `<changefreq>${opts.changefreq}</changefreq>`;
  if (opts.priority) s += `<priority>${opts.priority}</priority>`;
  return s + `</url>`;
}

function openParts() {
  const parts = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ];
  for (const [loc, cf, pr] of STATIC) parts.push(urlEntry(loc, { changefreq: cf, priority: pr }));
  return parts;
}

// Static section pages only — no DB, never throws (last-resort fallback).
function staticSitemapXml() {
  return openParts().concat(`</urlset>`).join("\n") + "\n";
}

async function buildSitemap() {
  const parts = openParts();

  // Dynamic content pages — best-effort; static pages above always ship.
  try {
    const news = await News.find({ status: "published" })
      .select("_id updatedAt publishedAt").sort("-publishedAt").limit(5000).lean();
    const { byId } = await require("./utils/slug").getSlugMap();
    for (const n of news) {
      parts.push(urlEntry(`/news/${byId[n._id] || n._id}`, { lastmod: isoDate(n.updatedAt || n.publishedAt), changefreq: "weekly", priority: "0.8" }));
    }
  } catch (e) {
    console.error("sitemap DB error (serving static pages only):", e.message);
  }

  parts.push(`</urlset>`);
  return parts.join("\n") + "\n";
}

module.exports = { buildSitemap, staticSitemapXml };
