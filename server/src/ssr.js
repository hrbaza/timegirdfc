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
const { getSlugMap, resolveNewsKey, publicNews, NO_COVER } = require("./utils/slug");
const { apply: applyLinkMap } = require("../../assets/js/linkmap.js"); // internal linking plan
const IMG = require("../../assets/js/imgsrc.js"); // responsive image URLs (same as the client)
const INFO = require("../../assets/js/infopages.js"); // about / contact / privacy / terms text
const { leanNews } = require("./controllers/miscController");

const SITE = "Time Grid FC";
const CANONICAL_BASE = "https://www.timegridfc.com";
const DEFAULT_DESC =
  "Time Grid FC — daily football news, match analysis, World Cup history and videos.";

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function clip(s, n) {
  s = String(s || "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}
// Excerpt from the article's own excerpt, else the first ~160 chars of the body.
function cardSummary(n) {
  const s = (n.excerpt || "").trim();
  if (s) return s;
  const t = String(n.body || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return t.length > 160 ? t.slice(0, 159).trimEnd() + "…" : t;
}
// Known mistyped article links in stored bodies -> the correct article.
const LINK_FIXES = { "/news/n-3irkrkh": "/news/n-drqk4s2" };
// Sections that were removed from the site; links to them render as plain text.
const DEAD_LINK = /^(https?:\/\/(www\.)?timegridfc\.com)?\/(player|players|team|teams|leagues|awards|transfers|schedule|daily)(\/|$|[?#])/i;
const OWN_SITE = /^https?:\/\/(www\.)?timegridfc\.com(\/|$)/i;
function fixLinks(html, slugMap) {
  let s = String(html == null ? "" : html);
  for (const [bad, good] of Object.entries(LINK_FIXES)) s = s.split(bad).join(good);
  // Old id links (/news/n-abc1234) -> the article's title URL, so no redirect hop.
  if (slugMap) s = s.replace(/\/news\/(n-[a-z0-9]+)(?![a-z0-9-])/gi, (m, id) => (slugMap.byId[id] ? "/news/" + slugMap.byId[id] : m));
  s = s.replace(/\[([^\]\n]+)\]\(([^\s)]+)\)/g, (m, text, url) => (DEAD_LINK.test(url) ? text : m));
  return s.replace(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (m, url, text) => (DEAD_LINK.test(url) ? text : m));
}
// Inline Markdown links [text](url) -> real <a> links (matches the client).
// Links to timegridfc.com stay in the same tab; other sites open in a new tab.
function linkify(html, slugMap) {
  return fixLinks(html, slugMap).replace(
    /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g,
    (m, text, url) => {
      const external = /^https?:\/\//i.test(url) && !OWN_SITE.test(url);
      return `<a href="${url}"${external ? ' target="_blank" rel="noopener"' : ""}>${text}</a>`;
    }
  );
}

/* ---- static meta for list / info pages ---- */
const SIMPLE = {
  news: ["News & Blog", "Latest football news, match analysis and features from Time Grid FC."],
  worldcup: ["World Cup History", "Every FIFA World Cup — hosts, champions and records."],
  videos: ["Videos", "Match analysis and football videos from the Time Grid FC channel."],
  about: [INFO.PAGES.about.title, INFO.PAGES.about.desc],
  contact: [INFO.PAGES.contact.title, INFO.PAGES.contact.desc],
  privacy: [INFO.PAGES.privacy.title, INFO.PAGES.privacy.desc],
  terms: [INFO.PAGES.terms.title, INFO.PAGES.terms.desc],
  signin: ["Sign In", "Sign in to your Time Grid FC account."],
  signup: ["Create Account", "Join the Time Grid FC community."],
  forgot: ["Reset Password", "Reset your Time Grid FC password with a one-time code sent to your email."],
  account: ["My Account", "Manage your Time Grid FC account."],
};

/* ---- server-rendered chrome (header + footer) so crawlers see navigation ---- */
const NAV = [["", "Home"], ["news", "News"], ["worldcup", "World Cup"], ["videos", "Videos"], ["about", "About"]];

function headerHtml() {
  const links = NAV.map(([r, l]) => `<a href="/${r}" data-route="${r}">${l}</a>`).join("");
  // The ticker strip is here from the start so the page does not jump down
  // when the client fills it with headlines (a layout shift, CLS).
  return `<div class="ticker" id="tg-ticker"><div class="run"><span>⚽ Welcome to Time Grid FC — football news, analysis &amp; videos</span></div></div>
    <nav class="nav"><div class="nav-inner">
      <a href="/" class="brand" aria-label="Time Grid FC home"><img class="logo" src="/assets/img/logo-96.webp" srcset="/assets/img/logo-96.webp 1x, /assets/img/logo-192.webp 2x" width="44" height="44" alt="" decoding="async"> <span class="brand-txt">Time<b>Grid</b>FC</span></a>
      <div class="nav-links">${links}</div>
    </div></nav>`;
}

function footerHtml() {
  const col = (title, links) => `<div><h4>${title}</h4>${links.map(([h, l]) => `<a href="${h}">${l}</a>`).join("")}</div>`;
  return `<div class="wrap foot">
      <div>
        <div class="brand" style="margin-bottom:.6rem"><img class="logo" src="/assets/img/logo-96.webp" srcset="/assets/img/logo-96.webp 1x, /assets/img/logo-192.webp 2x" width="44" height="44" alt="" decoding="async"> <span class="brand-txt">Time<b>Grid</b>FC</span></div>
        <p class="muted" style="max-width:34ch">Football news, match analysis &amp; videos — the official companion to the Time Grid FC YouTube channel.</p>
        <a class="btn gold sm" href="https://www.youtube.com/@timegrid_fc" target="_blank" rel="noopener">▶ Subscribe on YouTube</a>
      </div>
      ${col("Explore", [["/news", "News"], ["/worldcup", "World Cup"], ["/videos", "Videos"]])}
      ${col("Company", [["/about", "About Us"], ["/contact", "Contact"], ["/privacy", "Privacy Policy"], ["/terms", "Terms &amp; Disclaimer"]])}
    </div>
    <div class="wrap foot-bottom">
      <span>© ${new Date().getFullYear()} Time Grid FC. All rights reserved.</span>
      <span><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/contact">Contact</a></span>
    </div>`;
}

/* ---- server-rendered page content for list / home / info pages ---- */
function fmtDateShort(d) {
  try { return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; }
}
const newsUrl = (id, map) => "/news/" + ((map && map.byId[id]) || id);
// Card / featured image, written exactly like the client (imgsrc.js) so the
// browser reuses what this HTML already loaded when the SPA re-renders.
function coverImg(n, kind, eager) {
  if (!n.cover) return `<div class="ggrad" style="height:100%;background:linear-gradient(135deg,#0b6b3a,#16a34a)"></div>`;
  return `<img ${IMG.attrs(n.cover, kind)} alt="${esc(n.title)}" ${eager ? `fetchpriority="high"` : `loading="lazy"`} decoding="async">`;
}
function newsCardHtml(n, map) {
  return `<a class="card" href="${newsUrl(n._id || n.id, map)}">
      <div class="thumb">${coverImg(n, "card")}<span class="tag chip">${esc(n.category || "")}</span></div>
      <div class="pad"><h3>${esc(n.title)}</h3>
        <p class="muted" style="font-size:.9rem;margin:0">${esc(cardSummary(n))}</p>
        <div class="meta">${esc(n.author || SITE)} · ${fmtDateShort(n.publishedAt)}</div></div></a>`;
}
// Card lists come from leanNews: image fields are /api/media URLs, never base64.
async function fetchNewsList(limit) {
  try { return await leanNews(publicNews(), { limit }); } catch (e) { return []; }
}
const NEWS_PER_PAGE = 12;
async function fetchNewsPage(page) {
  try {
    const skip = (Math.max(1, page) - 1) * NEWS_PER_PAGE;
    const [rows, total] = await Promise.all([
      leanNews(publicNews(), { skip, limit: NEWS_PER_PAGE }),
      News.countDocuments(publicNews()),
    ]);
    return { rows, total };
  } catch (e) { return { rows: [], total: 0 }; }
}
function homeContent(news, map) {
  const cards = news.slice(0, 6).map((n) => newsCardHtml(n, map)).join("") || `<p class="muted">New articles are on the way.</p>`;
  const feat = news[0];
  // Same featured card as the client's home page, so the main image loads
  // from this HTML instead of waiting for the app's data.
  const featHtml = feat ? `<div><a class="hero-card" href="${newsUrl(feat._id || feat.id, map)}">
        <div class="cover">${coverImg(feat, "feature", true)}<span class="hero-badge">Featured</span></div>
        <div class="body"><span class="chip">${esc(feat.category || "")}</span>
          <h3 style="margin:.5rem 0 .3rem;font-size:1.3rem">${esc(feat.title)}</h3>
          <p class="muted" style="margin:0;font-size:.92rem">${esc(feat.excerpt || "")}</p></div>
      </a><div class="hero-blur"></div></div>` : "";
  return `<section class="hero wrap"><div class="hero-grid"><div>
      <span class="eyebrow">Time Grid FC · Football Hub</span>
      <h1>Where football <span class="hl">lives</span>.<br>Football news &amp; analysis.</h1>
      <p class="lead">Daily football news and analysis, World Cup history — and every video from the Time Grid FC channel.</p>
      <div class="hero-cta"><a class="btn" href="/news">Read the latest</a> <a class="btn ghost" href="/videos">Watch videos</a></div>
    </div>${featHtml}</div></section>
    <section class="wrap section" style="padding-top:0">
      <div class="section-head"><div><span class="eyebrow">News &amp; Blog</span><h2>Latest News</h2></div><a class="btn ghost sm" href="/news">All news</a></div>
      <div class="grid cols-3">${cards}</div>
    </section>`;
}
function newsListContent(rows, page, total, map) {
  const cards = rows.map((n) => newsCardHtml(n, map)).join("") || `<p class="muted">New articles are on the way.</p>`;
  const pages = Math.max(1, Math.ceil((total || 0) / NEWS_PER_PAGE));
  let pager = "";
  if (pages > 1) {
    let nums = "";
    for (let p = 1; p <= pages; p++) nums += `<a class="btn ${p === page ? "" : "ghost"} sm" href="/news?page=${p}">${p}</a>`;
    pager = `<nav class="pager" id="news-pager" aria-label="Pagination" style="display:flex;gap:.4rem;flex-wrap:wrap;justify-content:center;margin-top:1.6rem">
        ${page > 1 ? `<a class="btn ghost sm" href="/news?page=${page - 1}" rel="prev">← Prev</a>` : ""}
        ${nums}
        ${page < pages ? `<a class="btn ghost sm" href="/news?page=${page + 1}" rel="next">Next →</a>` : ""}
      </nav>`;
  }
  return `<section class="wrap section">
      <div class="section-head"><div><span class="eyebrow">News &amp; Blog</span><h1>Latest Football News</h1><p class="muted" style="margin:0">Daily football news, match analysis and features${pages > 1 ? ` · page ${page} of ${pages}` : ""}.</p></div></div>
      <div class="grid cols-3">${cards}</div>${pager}
    </section>`;
}
// About / Contact / Privacy / Terms come from the file the client also uses.
const INFO_CONTENT = Object.fromEntries(Object.entries(INFO.PAGES).map(([k, pg]) => [k,
  `<section class="wrap section article"><span class="eyebrow">${pg.eyebrow}</span><h1>${pg.h1}</h1><div class="content">${pg.html}</div></section>`]));
function genericContent(title, desc) {
  return `<section class="wrap section"><div class="section-head"><div><h1>${esc(title)}</h1><p class="muted" style="margin:0">${esc(desc)}</p></div></div></section>`;
}

/* ---- build per-route meta (+ prerendered content for articles) ---- */
async function buildMeta(seg, page) {
  const r = seg[0] || "";
  const id = seg[1] || "";
  const M = { title: "", desc: DEFAULT_DESC, type: "website", image: "", jsonLd: null, content: "", article: null };

  // id -> title-slug map of published articles (null if the DB is unreachable).
  let map = null;
  try { map = await getSlugMap(); } catch (e) { /* fall back to id URLs */ }

  if (r === "") {                                                                // homepage
    const latest = await fetchNewsList(6);
    M.content = homeContent(latest, map);
    if (latest[0] && latest[0].cover) M.preload = IMG.info(latest[0].cover, "feature");
    M.image = CANONICAL_BASE + "/assets/img/logo-512.webp";
    // Organization (logo) + WebSite (site name) — what Google uses for the
    // site name and logo shown next to search results.
    M.jsonLd = [{
      "@context": "https://schema.org", "@type": "Organization", "@id": CANONICAL_BASE + "/#organization",
      "name": SITE, "url": CANONICAL_BASE + "/",
      "logo": { "@type": "ImageObject", "url": CANONICAL_BASE + "/assets/img/logo-512.webp", "width": 512, "height": 512 },
      "sameAs": ["https://www.youtube.com/@timegrid_fc"],
    }, {
      "@context": "https://schema.org", "@type": "WebSite", "@id": CANONICAL_BASE + "/#website",
      "name": SITE, "alternateName": "TimeGridFC", "url": CANONICAL_BASE + "/",
      "publisher": { "@id": CANONICAL_BASE + "/#organization" },
    }];
    return M;
  }

  try {
    if (r === "news" && id) {
      // /news/<title-slug> is the real URL; an old /news/<id> URL 301s to it.
      let realId = id;
      try {
        const k = await resolveNewsKey(id);
        if (k.redirect) return { redirect: "/news/" + k.redirect };
        if (k.id) realId = k.id;
      } catch (e) { /* DB hiccup: try the segment as an id below */ }
      let n = null, dbOk = false;
      for (let a = 0; a < 3 && !dbOk; a++) {
        try { n = await News.findById(realId).select("-bodyImage1 -bodyImage2").lean(); dbOk = true; }
        catch (e) { await new Promise((rz) => setTimeout(rz, 150)); }
      }
      if (n && NO_COVER[n._id]) n.cover = "";                                  // no rights to this image
      if (n && n.status === "published") {
        // Related articles (same category first), mirroring the client's block.
        let related = [];
        try {
          related = await leanNews(publicNews({ category: n.category }, [n._id]), { limit: 3 });
          if (!related.length) related = await leanNews(publicNews(null, [n._id]), { limit: 3 });
        } catch (e) { /* render without it */ }
        return articleMeta(n, map, related);
      }
      if (dbOk) {
        // DB answered and there is no published article with this id → real 404
        // (a 200 "Article not found" would be a Soft 404 to Google).
        return {
          httpStatus: 404, title: "Article Not Found", type: "website", image: "",
          desc: "This article could not be found. Browse the latest football news on Time Grid FC.",
          content: `<section class="wrap section"><div class="empty"><div class="ball">⚽</div><p>Article not found.</p><p class="help"><a href="/news">← Back to all news</a></p></div></section>`,
        };
      }
      // DB error after retries — do NOT 404 a possibly-valid article; fall through
      // to soft "News & Blog" meta (200) and let the client hydrate.
    }
  } catch (e) {
    /* DB unavailable → fall through to generic meta; page still renders. */
  }

  if (SIMPLE[r]) {
    M.title = SIMPLE[r][0]; M.desc = SIMPLE[r][1];
    if (r === "news") {                                                          // /news list (paginated)
      const pg = Math.max(1, parseInt(page, 10) || 1);
      const { rows, total } = await fetchNewsPage(pg);
      if (pg > 1) M.title = `Football News — page ${pg}`;
      M.content = newsListContent(rows, pg, total, map);
    }
    else if (INFO_CONTENT[r]) M.content = INFO_CONTENT[r];                        // about/contact/privacy/terms
    else M.content = genericContent(M.title, M.desc);                            // players/teams/… (heading, not empty)
  } else if (r) {
    M.httpStatus = 404;
    M.title = "Not Found"; M.desc = "The page you were looking for could not be found.";
    M.content = `<section class="wrap section"><div class="empty"><div class="ball">⚽</div><p>Page not found.</p><p class="help"><a href="/">← Back home</a></p></div></section>`;
  }
  return M;
}

// Base64 images live in Mongo; expose them as absolute media URLs (never embed
// the base64 in the HTML / og:image).
function mediaUrl(col, id, field, val) {
  if (!val) return "";
  if (/^https?:\/\//i.test(val)) return val;
  if (/^data:/i.test(val)) return `${CANONICAL_BASE}/api/media/${col}/${id}/${field}`;
  return val;
}

// ISO 8601 for article dates (og/article meta and JSON-LD); "" if missing/invalid.
function isoDate(d) {
  const t = d ? new Date(d) : null;
  return t && !isNaN(t) ? t.toISOString() : "";
}
// Large share/preview image: Unsplash covers are stored at w=800; Google
// Discover and social cards want at least 1200px wide.
function largeImage(url) {
  return /^https:\/\/images\.unsplash\.com\//i.test(url || "") ? url.replace(/([?&])w=\d+/, "$1w=1200") : url;
}

function articleMeta(n, map, related) {
  const desc = clip(n.metaDescription || cardSummary(n), 160);
  const coverUrl = mediaUrl("news", n._id, "cover", n.cover);
  const pageUrl = `${CANONICAL_BASE}${newsUrl(n._id, map)}`;
  const kw = (n.keywords && n.keywords.length ? n.keywords : n.tags || []);
  const published = isoDate(n.publishedAt);
  // Never earlier than the publish date (a post saved just before its publish time).
  const modified = [isoDate(n.updatedAt), published].filter(Boolean).sort().pop() || "";
  const M = {
    title: n.title, desc, type: "article", image: largeImage(coverUrl), imageAlt: n.title,
    preload: coverUrl ? IMG.info(coverUrl, "hero") : null,
    keywords: Array.isArray(kw) ? kw.join(", ") : String(kw || ""),
    content: articleContent(n, coverUrl, map, related),
    article: { published, modified, section: n.category, tags: Array.isArray(n.tags) ? n.tags : [] },
  };
  M.jsonLd = [{
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": n.title,
    "description": desc,
    "image": coverUrl ? [largeImage(coverUrl)] : undefined,
    "datePublished": published || undefined,
    "dateModified": modified || undefined,
    "author": { "@type": "Organization", "name": n.author || SITE, "url": CANONICAL_BASE + "/about" },
    "publisher": { "@type": "Organization", "name": SITE, "url": CANONICAL_BASE + "/", "logo": { "@type": "ImageObject", "url": CANONICAL_BASE + "/assets/img/logo-512.webp", "width": 512, "height": 512 } },
    "mainEntityOfPage": { "@type": "WebPage", "@id": pageUrl },
    "articleSection": n.category,
    "keywords": M.keywords,
    "inLanguage": "en",
  }, {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": CANONICAL_BASE + "/" },
      { "@type": "ListItem", "position": 2, "name": "News", "item": CANONICAL_BASE + "/news" },
      { "@type": "ListItem", "position": 3, "name": n.title, "item": pageUrl },
    ],
  }];
  return M;
}

// Minimal server-rendered article so crawlers read the content without JS.
function articleContent(n, coverUrl, map, related) {
  let dateStr = "";
  try { dateStr = new Date(n.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch (e) {}
  const cu = coverUrl != null ? coverUrl : mediaUrl("news", n._id, "cover", n.cover);
  const cover = cu ? `<figure class="cover"><img ${IMG.attrs(cu, "hero")} alt="${esc(n.title)}" fetchpriority="high" decoding="async"></figure>` : "";
  const tags = (n.tags || []).map((t) => `<span class="chip">#${esc(t)}</span>`).join(" ");
  const body = linkify(applyLinkMap(String(n._id), n.body) || `<p>${esc(n.excerpt || "")}</p>`, map); // authored HTML (trusted)
  const rel = (related || []).length
    ? `<section class="wrap section" style="padding-top:0"><div class="section-head"><h2>Related articles</h2></div><div class="grid cols-3">${related.map((r) => newsCardHtml(r, map)).join("")}</div></section>`
    : "";
  return `<article class="wrap section article">
      <nav class="muted" aria-label="Breadcrumb" style="font-size:.85rem;margin-bottom:.6rem"><a href="/">Home</a> › <a href="/news">News</a></nav>
      <span class="badge-cat">${esc(n.category || "")}</span>
      <h1>${esc(n.title)}</h1>
      <div class="byline"><span>By <b>${esc(n.author || SITE)}</b></span> · <span>${esc(dateStr)}</span></div>
      <div class="tag-row">${tags}</div>
      ${cover}
      ${n.excerpt ? `<p class="lede">${esc(n.excerpt)}</p>` : ""}
      <div class="content">${body}</div>
    </article>${rel}`;
}

/* ---- inject meta + content into the index.html template ---- */
function injectHead(html, M, canonicalUrl) {
  const full = M.title ? `${esc(M.title)} — ${SITE}` : `${SITE} — Football News, Analysis & Videos`;
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
  // Per-article keywords replace the sitewide default list.
  if (M.keywords) html = html.replace(/<meta name="keywords"[^>]*>/, `<meta name="keywords" content="${esc(M.keywords)}" />`);
  if (M.image) {
    tags.push(`<meta property="og:image" content="${esc(M.image)}" />`);
    if (M.imageAlt) tags.push(`<meta property="og:image:alt" content="${esc(M.imageAlt)}" />`);
    tags.push(`<meta name="twitter:image" content="${esc(M.image)}" />`);
  }
  if (M.article) {
    if (M.article.published) tags.push(`<meta property="article:published_time" content="${esc(M.article.published)}" />`);
    if (M.article.modified) tags.push(`<meta property="article:modified_time" content="${esc(M.article.modified)}" />`);
    tags.push(`<meta property="article:section" content="${esc(M.article.section || "")}" />`);
    (M.article.tags || []).forEach((t) => tags.push(`<meta property="article:tag" content="${esc(t)}" />`));
  }
  // Start the page's main image (the LCP) download as early as possible.
  if (M.preload && M.preload.src) {
    tags.push(`<link rel="preload" as="image" href="${esc(M.preload.src)}"` +
      (M.preload.srcset ? ` imagesrcset="${esc(M.preload.srcset)}" imagesizes="${esc(M.preload.sizes)}"` : "") + ` fetchpriority="high" />`);
  }
  // "</" is escaped so article text can never close the script tag early.
  if (M.jsonLd) tags.push(`<script type="application/ld+json" id="tg-jsonld">${JSON.stringify(M.jsonLd).replace(/<\//g, "<\\/")}</script>`);

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
  const page = Math.max(1, parseInt((req.query && req.query.page) || "1", 10) || 1);
  const M = await buildMeta(seg, page);
  if (M.redirect) return { redirect: M.redirect, status: 301 };
  // Canonical keeps ?page for paginated news so each page is its own URL.
  const isNewsPage = seg[0] === "news" && !seg[1] && page > 1;
  const canonicalUrl = CANONICAL_BASE + (urlPath === "/" ? "/" : urlPath) + (isNewsPage ? `?page=${page}` : "");
  let html = injectHead(template, M, canonicalUrl);
  html = html.replace("<!--SSR_CONTENT-->", M.content || "");
  // Server-render the nav + footer too, so crawlers see navigation and links
  // even without executing JavaScript. The client re-renders over these.
  html = html.replace('<header id="tg-header"></header>', `<header id="tg-header">${headerHtml()}</header>`);
  html = html.replace('<footer id="tg-footer"></footer>', `<footer id="tg-footer">${footerHtml()}</footer>`);
  return { html, status: M.httpStatus || 200 };
}

module.exports = { renderPage };
