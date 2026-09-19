/* =========================================================================
   Time Grid FC — llms.txt / llms-full.txt
   The AI equivalent of robots.txt + sitemap: a clean, structured summary of
   the site for LLM answer engines (ChatGPT, Claude, Perplexity, Gemini) so
   they understand and cite it accurately.
     • /llms.txt      — concise index: intro, sections, latest articles
     • /llms-full.txt — the same, plus the full plain-text of every article
   Both are generated from the database and are resilient if the DB is down.
   ========================================================================= */
const News = require("./models/News");

const SITE = "Time Grid FC";
const BASE = "https://www.timegridfc.com";
const SUMMARY =
  "Time Grid FC is a football (soccer) news and reference site: daily news and " +
  "match analysis, a searchable database of players and clubs, league and World " +
  "Cup history, awards, transfers, fixtures and videos. It is the companion site " +
  "to the Time Grid FC YouTube channel (@timegrid_fc).";

const SECTIONS = [
  ["Football News & Blog", "/news", "daily news, match & player analysis, features"],
  ["Players", "/players", "player database organised by country"],
  ["Teams & Clubs", "/teams", "clubs, stadiums and honours"],
  ["Leagues & Competitions", "/leagues", "league champions and competition history"],
  ["World Cup", "/worldcup", "hosts, champions and records"],
  ["Awards", "/awards", "Ballon d'Or and major football award winners"],
  ["Transfers", "/transfers", "latest transfers, fees and deals"],
  ["Fixtures & Results", "/schedule", "upcoming matches, live scores and results"],
  ["Videos", "/videos", "match analysis and football videos"],
  ["About", "/about", "about Time Grid FC"],
  ["Contact", "/contact", "get in touch"],
];

function fmtDate(d) {
  try { return new Date(d).toISOString().slice(0, 10); } catch (e) { return ""; }
}
// Convert authored article HTML to readable plain text for llms-full.txt.
function htmlToText(html) {
  return String(html || "")
    .replace(/<\s*(br)\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|h2|h3|h4|li|blockquote|div|ul|ol)>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "- ")
    .replace(/<h2[^>]*>/gi, "\n## ").replace(/<h3[^>]*>/gi, "\n### ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function header() {
  const lines = [
    `# ${SITE}`,
    "",
    `> ${SUMMARY}`,
    "",
    `Base URL: ${BASE}`,
    "",
    "## Sections",
    ...SECTIONS.map(([name, path, desc]) => `- [${name}](${BASE}${path}): ${desc}`),
    "",
  ];
  return lines;
}

async function buildLlms() {
  const lines = header();
  try {
    const news = await News.find({ status: "published" })
      .select("_id title excerpt metaDescription publishedAt").sort("-publishedAt").limit(100).lean();
    if (news.length) {
      lines.push("## Latest articles");
      for (const n of news) {
        const blurb = (n.excerpt || n.metaDescription || "").replace(/\s+/g, " ").trim();
        lines.push(`- [${n.title}](${BASE}/news/${n._id})${blurb ? ": " + blurb : ""}`);
      }
      lines.push("");
    }
  } catch (e) { console.error("llms.txt DB error:", e.message); }
  lines.push(`## Channel`, `- [YouTube: @timegrid_fc](https://www.youtube.com/@timegrid_fc)`, "");
  return lines.join("\n");
}

async function buildLlmsFull() {
  const lines = header();
  lines.push("---", "", "# Articles (full text)", "");
  try {
    const news = await News.find({ status: "published" })
      .select("_id title excerpt category author publishedAt updatedAt keywords body").sort("-publishedAt").limit(200).lean();
    for (const n of news) {
      lines.push(`## ${n.title}`);
      lines.push(`URL: ${BASE}/news/${n._id}`);
      if (n.category) lines.push(`Category: ${n.category}`);
      lines.push(`Author: ${n.author || SITE}`);
      lines.push(`Published: ${fmtDate(n.publishedAt)}${n.updatedAt && n.updatedAt !== n.publishedAt ? " (updated " + fmtDate(n.updatedAt) + ")" : ""}`);
      if (n.keywords && n.keywords.length) lines.push(`Keywords: ${n.keywords.join(", ")}`);
      lines.push("");
      if (n.excerpt) lines.push(n.excerpt.trim(), "");
      lines.push(htmlToText(n.body));
      lines.push("", "---", "");
    }
  } catch (e) { console.error("llms-full.txt DB error:", e.message); }
  return lines.join("\n");
}

module.exports = { buildLlms, buildLlmsFull };
