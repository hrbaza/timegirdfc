/* =========================================================================
   Time Grid FC — dynamic sitemap.xml
   Built from the database so every published article (and player/team/league
   page) is listed with a fresh <lastmod>. Resilient: if the DB is unavailable
   it still returns a valid sitemap of the static section pages.
   ========================================================================= */
const News = require("./models/News");
const Player = require("./models/Player");
const Team = require("./models/Team");
const League = require("./models/League");

const BASE = "https://www.timegridfc.com";

// Static section pages: [path, changefreq, priority]
const STATIC = [
  ["/", "daily", "1.0"],
  ["/news", "daily", "0.9"],
  ["/players", "weekly", "0.8"],
  ["/teams", "weekly", "0.8"],
  ["/schedule", "daily", "0.7"],
  ["/leagues", "weekly", "0.7"],
  ["/worldcup", "monthly", "0.7"],
  ["/awards", "monthly", "0.6"],
  ["/transfers", "daily", "0.7"],
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
    for (const n of news) {
      parts.push(urlEntry(`/news/${n._id}`, { lastmod: isoDate(n.updatedAt || n.publishedAt), changefreq: "weekly", priority: "0.8" }));
    }

    const players = await Player.find().select("_id").limit(5000).lean();
    for (const p of players) parts.push(urlEntry(`/player/${p._id}`, { changefreq: "monthly", priority: "0.6" }));

    const teams = await Team.find().select("_id").limit(2000).lean();
    for (const t of teams) parts.push(urlEntry(`/team/${t._id}`, { changefreq: "monthly", priority: "0.6" }));

    const leagues = await League.find().select("_id").limit(1000).lean();
    for (const l of leagues) parts.push(urlEntry(`/leagues/${l._id}`, { changefreq: "monthly", priority: "0.6" }));
  } catch (e) {
    console.error("sitemap DB error (serving static pages only):", e.message);
  }

  parts.push(`</urlset>`);
  return parts.join("\n") + "\n";
}

module.exports = { buildSitemap, staticSitemapXml };
