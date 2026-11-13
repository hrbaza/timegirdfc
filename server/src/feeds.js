/* =========================================================================
   Time Grid FC — Google News sitemap and RSS feed
   /news-sitemap.xml : articles from the last 48 hours, in the Google News
                       sitemap format (helps Top Stories / Google News find new posts).
   /rss.xml          : the latest 30 articles as RSS 2.0, for feed readers and
                       aggregators.
   Both are built from the database and list only public, non-merged articles.
   ========================================================================= */
const News = require("./models/News");
const { publicNews, getSlugMap } = require("./utils/slug");
const { authorOf } = require("../../assets/js/infopages.js");

const BASE = "https://www.timegridfc.com";
const SITE = "Time Grid FC";

const x = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const text = (html) => String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

async function latest(filter, limit) {
  const [rows, map] = await Promise.all([
    News.find(publicNews(filter)).select("_id title excerpt metaDescription body category author tags publishedAt updatedAt")
      .sort("-publishedAt").limit(limit).lean(),
    getSlugMap(),
  ]);
  return rows.map((n) => ({ ...n, url: BASE + "/news/" + ((map && map.byId[n._id]) || n._id) }));
}

// Google News sitemap: only articles published in the last two days.
async function buildNewsSitemap() {
  const since = new Date(Date.now() - 48 * 3600 * 1000);
  const rows = await latest({ publishedAt: { $gte: since } }, 1000);
  const items = rows.map((n) => `  <url>
    <loc>${x(n.url)}</loc>
    <news:news>
      <news:publication><news:name>${SITE}</news:name><news:language>en</news:language></news:publication>
      <news:publication_date>${new Date(n.publishedAt).toISOString()}</news:publication_date>
      <news:title>${x(n.title)}</news:title>
    </news:news>
  </url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items.join("\n")}
</urlset>
`;
}

// RSS 2.0 feed of the latest articles.
async function buildRss() {
  const rows = await latest(null, 30);
  const items = rows.map((n) => {
    const desc = n.excerpt || n.metaDescription || text(n.body).slice(0, 300);
    const a = authorOf(n);
    return `    <item>
      <title>${x(n.title)}</title>
      <link>${x(n.url)}</link>
      <guid isPermaLink="true">${x(n.url)}</guid>
      <pubDate>${new Date(n.publishedAt).toUTCString()}</pubDate>
      <dc:creator>${x(a.role ? `${a.name}, ${a.role}` : a.name)}</dc:creator>
      <category>${x(n.category || "")}</category>
      <description>${x(desc)}</description>
    </item>`;
  });
  const updated = rows[0] ? new Date(rows[0].publishedAt).toUTCString() : new Date().toUTCString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${SITE} — Football News &amp; Analysis</title>
    <link>${BASE}/</link>
    <atom:link href="${BASE}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Football news, match previews, reports and analysis from ${SITE}.</description>
    <language>en</language>
    <lastBuildDate>${updated}</lastBuildDate>
    <image><url>${BASE}/assets/img/logo-192.png</url><title>${SITE}</title><link>${BASE}/</link></image>
${items.join("\n")}
  </channel>
</rss>
`;
}

module.exports = { buildNewsSitemap, buildRss };
