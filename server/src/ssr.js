/* =========================================================================
   Time Grid FC — Server-side rendering (SEO)
   For every page request, inject the correct <head> meta (title, description,
   canonical, Open Graph, Twitter, JSON-LD) into the index.html template, and
   pre-render article content, so crawlers that don't run JavaScript (Bing,
   social scrapers) and Google both get real per-page HTML. The client SPA then
   hydrates on top for full interactivity.
   ========================================================================= */
const path = require("path");
const fs = require("fs");

const News = require("./models/News");
const Player = require("./models/Player");
const Team = require("./models/Team");
const League = require("./models/League");
const Country = require("./models/Country");

const SITE = "Time Grid FC";
const CANONICAL_BASE = "https://www.timegridfc.com";
const DEFAULT_DESC =
  "Time Grid FC — daily football news, match analysis, player & team databases, league and World Cup history, awards, transfers and more.";

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function clip(s, n) {
  s = String(s || "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

/* ---- static meta for list / info pages ---- */
const SIMPLE = {
  news: ["News & Blog", "Latest football news, match analysis and features from Time Grid FC."],
  players: ["Players by Country", "Browse the Time Grid FC player database organised by country."],
  teams: ["Teams & Clubs", "Explore football clubs, stadiums and honours in the Time Grid FC database."],
  schedule: ["Match Schedule", "Upcoming fixtures, live matches and results — Time Grid FC."],
  leagues: ["Leagues & Competitions", "League champions, competition history and standings."],
  worldcup: ["World Cup History", "Every FIFA World Cup — hosts, champions and records."],
  awards: ["Football Awards", "Ballon d'Or and major football award winners through history."],
  transfers: ["Transfer News", "The latest football transfers, fees and completed deals."],
  videos: ["Videos", "Match analysis and football videos from the Time Grid FC channel."],
  about: ["About Us", "About Time Grid FC — our football coverage and mission."],
  contact: ["Contact", "Get in touch with the Time Grid FC editorial team."],
  privacy: ["Privacy Policy", "How Time Grid FC handles your data and privacy."],
  terms: ["Terms & Disclaimer", "Terms of use and disclaimer for Time Grid FC."],
  signin: ["Sign In", "Sign in to your Time Grid FC account."],
  signup: ["Create Account", "Join the Time Grid FC community."],
  forgot: ["Reset Password", "Reset your Time Grid FC password with a one-time code sent to your email."],
  account: ["My Account", "Manage your Time Grid FC account."],
};

/* ---- build per-route meta (+ prerendered content for articles) ---- */
async function buildMeta(seg) {
  const r = seg[0] || "";
  const id = seg[1] || "";
  const M = { title: "", desc: DEFAULT_DESC, type: "website", image: "", jsonLd: null, content: "", article: null };

  if (r === "") return M; // home → default meta

  try {
    if (r === "news" && id) {
      const n = await News.findById(id).lean();
      if (n && n.status === "published") return articleMeta(n);
    } else if (r === "player" && id) {
      const p = await Player.findById(id).lean();
      if (p) {
        const c = p.country ? await Country.findById(p.country).lean() : null;
        M.title = p.name;
        M.desc = clip(`${p.name} — ${p.pos}${c ? ", " + c.name : ""}. Profile, stats and career history on Time Grid FC.`, 160);
        M.type = "profile";
        if (p.photo) M.image = p.photo;
        return M;
      }
    } else if (r === "team" && id) {
      const t = await Team.findById(id).lean();
      if (t) {
        M.title = t.name;
        M.desc = clip(`${t.name}${t.stadium ? " — " + t.stadium : ""}. Squad, honours and club profile on Time Grid FC.`, 160);
        return M;
      }
    } else if (r === "leagues" && id) {
      const l = await League.findById(id).lean();
      if (l) {
        M.title = l.name;
        M.desc = clip(`${l.name}${l.country ? " (" + l.country + ")" : ""} — champions, history and standings on Time Grid FC.`, 160);
        return M;
      }
    } else if (r === "players" && id) {
      const c = await Country.findById(id).lean();
      if (c) { M.title = `${c.name} Players`; M.desc = clip(`All ${c.name} players in the Time Grid FC database.`, 160); return M; }
    }
  } catch (e) {
    /* DB unavailable → fall through to generic meta; page still renders. */
  }

  if (SIMPLE[r]) { M.title = SIMPLE[r][0]; M.desc = SIMPLE[r][1]; }
  else if (r) { M.title = "Not Found"; M.desc = "The page you were looking for could not be found."; }
  return M;
}

function articleMeta(n) {
  const desc = clip(n.metaDescription || n.excerpt || "", 160);
  const M = {
    title: n.title, desc, type: "article", image: n.cover || "",
    content: articleContent(n),
    article: { published: n.publishedAt, modified: n.updatedAt || n.publishedAt, section: n.category },
  };
  M.jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": n.title,
    "description": desc,
    "image": n.cover ? [n.cover] : undefined,
    "datePublished": n.publishedAt,
    "dateModified": n.updatedAt || n.publishedAt,
    "author": { "@type": "Organization", "name": n.author || SITE },
    "publisher": { "@type": "Organization", "name": SITE },
    "mainEntityOfPage": { "@type": "WebPage", "@id": `${CANONICAL_BASE}/news/${n._id}` },
    "articleSection": n.category,
    "keywords": (n.keywords || n.tags || []).join(", "),
  };
  return M;
}

// Minimal server-rendered article so crawlers read the content without JS.
function articleContent(n) {
  let dateStr = "";
  try { dateStr = new Date(n.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch (e) {}
  const cover = n.cover ? `<figure class="cover"><img src="${esc(n.cover)}" alt="${esc(n.title)}"></figure>` : "";
  const tags = (n.tags || []).map((t) => `<span class="chip">#${esc(t)}</span>`).join(" ");
  const body = n.body || `<p>${esc(n.excerpt || "")}</p>`; // authored HTML (trusted)
  return `<article class="wrap section article">
      <span class="badge-cat">${esc(n.category || "")}</span>
      <h1>${esc(n.title)}</h1>
      <div class="byline"><span>By <b>${esc(n.author || SITE)}</b></span> · <span>${esc(dateStr)}</span></div>
      <div class="tag-row">${tags}</div>
      ${cover}
      ${n.excerpt ? `<p class="lede">${esc(n.excerpt)}</p>` : ""}
      <div class="content">${body}</div>
    </article>`;
}

/* ---- inject meta + content into the index.html template ---- */
function injectHead(html, M, canonicalUrl) {
  const full = M.title ? `${esc(M.title)} — ${SITE}` : `${SITE} — Football News, Stats & Community`;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${full}</title>`);
  html = html.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(M.desc)}" />`);
  // Drop the static default OG tags so we can inject accurate per-page ones.
  html = html.replace(/\s*<meta property="og:title"[^>]*>/, "");
  html = html.replace(/\s*<meta property="og:description"[^>]*>/, "");
  html = html.replace(/\s*<meta property="og:type"[^>]*>/, "");

  const tags = [
    `<meta property="og:title" content="${full}" />`,
    `<meta property="og:description" content="${esc(M.desc)}" />`,
    `<meta property="og:type" content="${esc(M.type)}" />`,
    `<meta property="og:site_name" content="${SITE}" />`,
    `<meta property="og:url" content="${esc(canonicalUrl)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${full}" />`,
    `<meta name="twitter:description" content="${esc(M.desc)}" />`,
    `<link rel="canonical" href="${esc(canonicalUrl)}" />`,
  ];
  if (M.image) {
    tags.push(`<meta property="og:image" content="${esc(M.image)}" />`);
    tags.push(`<meta name="twitter:image" content="${esc(M.image)}" />`);
  }
  if (M.article) {
    tags.push(`<meta property="article:published_time" content="${esc(M.article.published || "")}" />`);
    tags.push(`<meta property="article:modified_time" content="${esc(M.article.modified || "")}" />`);
    tags.push(`<meta property="article:section" content="${esc(M.article.section || "")}" />`);
  }
  if (M.jsonLd) tags.push(`<script type="application/ld+json" id="tg-jsonld">${JSON.stringify(M.jsonLd)}</script>`);

  return html.replace("<!--SSR_HEAD-->", tags.join("\n  "));
}

/* ---- template loading (cached; robust to path differences on Vercel) ---- */
let TEMPLATE = null;
function loadTemplate(clientDir) {
  if (TEMPLATE != null) return TEMPLATE;
  const candidates = [
    clientDir && path.join(clientDir, "index.html"),
    path.resolve(process.cwd(), "index.html"),
    path.resolve(__dirname, "..", "..", "index.html"),
  ].filter(Boolean);
  for (const p of candidates) {
    try { TEMPLATE = fs.readFileSync(p, "utf8"); return TEMPLATE; } catch (e) { /* try next */ }
  }
  throw new Error("index.html template not found");
}

async function renderPage(req, clientDir) {
  const template = loadTemplate(clientDir);
  let urlPath = (req.path || "/").replace(/\/+$/, "") || "/";
  const seg = urlPath.split("/").filter(Boolean);
  const M = await buildMeta(seg);
  const canonicalUrl = CANONICAL_BASE + (urlPath === "/" ? "/" : urlPath);
  let html = injectHead(template, M, canonicalUrl);
  html = html.replace("<!--SSR_CONTENT-->", M.content || "");
  return html;
}

module.exports = { renderPage };
