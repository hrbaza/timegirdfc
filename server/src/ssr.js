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
// Inline Markdown links [text](url) -> real <a> links (matches the client).
function linkify(html) {
  return String(html == null ? "" : html).replace(
    /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g,
    (m, text, url) => {
      const external = /^https?:\/\//i.test(url);
      return `<a href="${url}"${external ? ' target="_blank" rel="noopener"' : ""}>${text}</a>`;
    }
  );
}

/* ---- static meta for list / info pages ---- */
const SIMPLE = {
  news: ["News & Blog", "Latest football news, match analysis and features from Time Grid FC."],
  worldcup: ["World Cup History", "Every FIFA World Cup — hosts, champions and records."],
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

/* ---- server-rendered chrome (header + footer) so crawlers see navigation ---- */
const NAV = [["", "Home"], ["news", "News"], ["worldcup", "World Cup"], ["videos", "Videos"], ["about", "About"]];

function headerHtml() {
  const links = NAV.map(([r, l]) => `<a href="/${r}" data-route="${r}">${l}</a>`).join("");
  return `<nav class="nav"><div class="nav-inner">
      <a href="/" class="brand" aria-label="Time Grid FC home">Time<b>Grid</b>FC</a>
      <div class="nav-links">${links}</div>
    </div></nav>`;
}

function footerHtml() {
  const col = (title, links) => `<div><h4>${title}</h4>${links.map(([h, l]) => `<a href="${h}">${l}</a>`).join("")}</div>`;
  return `<div class="wrap foot">
      <div>
        <div class="brand" style="margin-bottom:.6rem">Time<b>Grid</b>FC</div>
        <p class="muted" style="max-width:34ch">Football news, stats &amp; community — the official companion to the Time Grid FC YouTube channel.</p>
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
function newsCardHtml(n) {
  return `<a class="card" href="/news/${n._id}">
      <div class="thumb"><div class="ggrad" style="height:100%;background:linear-gradient(135deg,#0b6b3a,#16a34a)"></div></div>
      <div class="pad"><h3>${esc(n.title)}</h3>
        <p class="muted" style="font-size:.9rem;margin:0">${esc(cardSummary(n))}</p>
        <div class="meta">${esc(n.author || SITE)} · ${fmtDateShort(n.publishedAt)}</div></div></a>`;
}
async function fetchNewsList(limit) {
  try {
    return await News.find({ status: "published" })
      .select("title excerpt body metaDescription category author publishedAt").sort("-publishedAt").limit(limit).lean();
  } catch (e) { return []; }
}
const NEWS_PER_PAGE = 12;
async function fetchNewsPage(page) {
  try {
    const skip = (Math.max(1, page) - 1) * NEWS_PER_PAGE;
    const [rows, total] = await Promise.all([
      News.find({ status: "published" }).select("title excerpt body metaDescription category author publishedAt").sort("-publishedAt").skip(skip).limit(NEWS_PER_PAGE).lean(),
      News.countDocuments({ status: "published" }),
    ]);
    return { rows, total };
  } catch (e) { return { rows: [], total: 0 }; }
}
function homeContent(news) {
  const cards = news.slice(0, 6).map(newsCardHtml).join("") || `<p class="muted">New articles are on the way.</p>`;
  return `<section class="hero wrap"><div class="hero-grid"><div>
      <span class="eyebrow">Time Grid FC · Football Hub</span>
      <h1>Where football <span class="hl">lives</span>. News, stats &amp; every story.</h1>
      <p class="lead">Daily football news and analysis, World Cup history — and every video from the Time Grid FC channel.</p>
      <div class="hero-cta"><a class="btn" href="/news">Read the latest</a> <a class="btn ghost" href="/videos">Watch videos</a></div>
    </div></div></section>
    <section class="wrap section" style="padding-top:0">
      <div class="section-head"><div><span class="eyebrow">News &amp; Blog</span><h2>Latest News</h2></div><a class="btn ghost sm" href="/news">All news</a></div>
      <div class="grid cols-3">${cards}</div>
    </section>`;
}
function newsListContent(rows, page, total) {
  const cards = rows.map(newsCardHtml).join("") || `<p class="muted">New articles are on the way.</p>`;
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
const INFO_CONTENT = {
  about: `<section class="wrap section article"><span class="eyebrow">About Us</span><h1>About Time Grid FC</h1><div class="content">
      <p>Time Grid FC is an independent football content hub and the companion website to the <a href="https://www.youtube.com/@timegrid_fc" target="_blank" rel="noopener">Time Grid FC YouTube channel</a>, which produces match analysis, player breakdowns, and football news for a growing community of fans.</p>
      <p>Our goal is to be a genuinely useful football destination: original daily news and analysis, the history of the FIFA World Cup, and every video from our channel — all in one place.</p>
      <h2>Who runs this site</h2>
      <p>Time Grid FC is an independent project created and edited by the Time Grid FC team. All editorial articles on this site are written originally by our team. We are not affiliated with, endorsed by, or officially connected to any football club, league, or governing body; club and competition names are used descriptively for identification only.</p>
      <h2>Editorial standards</h2>
      <p>We aim for accuracy and clearly separate reporting from opinion and analysis. If you spot an error, please contact us and we will review and correct it promptly.</p>
      <h2>Media &amp; image credits</h2>
      <p>Player photographs are sourced from <a href="https://commons.wikimedia.org" target="_blank" rel="noopener">Wikimedia Commons</a> under their respective Creative Commons licences; editorial and cover imagery is provided by <a href="https://unsplash.com" target="_blank" rel="noopener">Unsplash</a>; country flags are from <a href="https://flagcdn.com" target="_blank" rel="noopener">flagcdn</a>. Video thumbnails belong to their respective owners and are shown only to link viewers to the original videos on YouTube.</p>
      <h2>Contact</h2>
      <p>Have a story tip, a correction, or a question? Visit our <a href="/contact">Contact page</a> or reach us any time at <a href="mailto:timegridfc@gmail.com">timegridfc@gmail.com</a>.</p>
    </div></section>`,
  contact: `<section class="wrap section article"><span class="eyebrow">Contact Us</span><h1>Get in touch</h1><div class="content">
      <p>We'd love to hear from you — whether it's a story tip, a correction to something we've published, feedback on the site, or a general enquiry.</p>
      <p><b>Email:</b> <a href="mailto:timegridfc@gmail.com">timegridfc@gmail.com</a><br><b>YouTube:</b> <a href="https://www.youtube.com/@timegrid_fc" target="_blank" rel="noopener">@timegrid_fc</a></p>
    </div></section>`,
  privacy: `<section class="wrap section article"><span class="eyebrow">Legal</span><h1>Privacy Policy</h1><div class="content">
      <p>This Privacy Policy explains how Time Grid FC ("we", "us", "our") collects, uses, and safeguards information when you visit this website. By using the site, you agree to the practices described here.</p>
      <h2>Information we collect</h2>
      <p><b>Account information.</b> If you create an account, we store the name and email address you provide and an encrypted (hashed) version of your password.</p>
      <p><b>Content you submit.</b> Comments you post on articles are stored and displayed with your chosen name.</p>
      <p><b>Usage &amp; log data.</b> Like most websites, our servers automatically record standard information such as your browser type, device, approximate location derived from your IP address, referring pages, and the pages you view.</p>
      <h2>Cookies</h2>
      <p>We use cookies and similar browser storage to keep you signed in, remember preferences such as your light/dark theme choice, and understand how the site is used. You can control or delete cookies through your browser settings.</p>
      <h2>Third-party advertising (Google AdSense)</h2>
      <p>We may use Google AdSense to display advertisements. Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this and other websites.</p>
      <ul>
        <li>Google's use of advertising cookies enables it and its partners to serve ads to you based on your visits to this site and/or other sites on the Internet.</li>
        <li>You may opt out of personalised advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener">Google Ads Settings</a>.</li>
        <li>You can also opt out of some third-party vendors' use of cookies at <a href="https://www.aboutads.info" target="_blank" rel="noopener">aboutads.info</a>.</li>
      </ul>
      <h2>Third-party links &amp; media</h2>
      <p>This site links to external sites (such as YouTube) and displays media sourced from third parties (see our <a href="/about">media credits</a>). We are not responsible for the content or privacy practices of external sites.</p>
      <h2>Children's privacy</h2>
      <p>This site is not directed to children under the age of 13, and we do not knowingly collect personal information from them.</p>
      <h2>Your rights</h2>
      <p>You may request access to, correction of, or deletion of the personal information associated with your account by contacting us.</p>
      <h2>Contact</h2>
      <p>Questions about this policy? Email us at <a href="mailto:timegridfc@gmail.com">timegridfc@gmail.com</a> or use our <a href="/contact">Contact page</a>.</p>
    </div></section>`,
  terms: `<section class="wrap section article"><span class="eyebrow">Legal</span><h1>Terms of Use &amp; Disclaimer</h1><div class="content">
      <p>By accessing and using Time Grid FC, you accept these terms. If you do not agree, please do not use the site.</p>
      <h2>Content &amp; accuracy</h2>
      <p>All articles are provided for general information, analysis, and entertainment. While we strive for accuracy, football data and news change quickly and we make no warranty that all content is complete, current, or error-free. Nothing on this site constitutes professional or betting advice.</p>
      <h2>Intellectual property</h2>
      <p>Original editorial content on this site is owned by Time Grid FC. Club names, competition names, and any trademarks referenced remain the property of their respective owners and are used for identification and descriptive purposes only.</p>
      <h2>User-contributed content</h2>
      <p>You are responsible for comments you post. Do not post unlawful, abusive, misleading, or infringing content. We may moderate, edit, or remove comments at our discretion.</p>
      <h2>External links</h2>
      <p>This site contains links to third-party websites, including YouTube. We are not responsible for the content, policies, or availability of those sites.</p>
      <h2>Limitation of liability</h2>
      <p>The site is provided "as is" without warranties of any kind. To the fullest extent permitted by law, Time Grid FC is not liable for any loss or damage arising from your use of the site.</p>
      <h2>Contact</h2>
      <p>Questions? Email <a href="mailto:timegridfc@gmail.com">timegridfc@gmail.com</a>.</p>
    </div></section>`,
};
function genericContent(title, desc) {
  return `<section class="wrap section"><div class="section-head"><div><h1>${esc(title)}</h1><p class="muted" style="margin:0">${esc(desc)}</p></div></div></section>`;
}

/* ---- build per-route meta (+ prerendered content for articles) ---- */
async function buildMeta(seg, page) {
  const r = seg[0] || "";
  const id = seg[1] || "";
  const M = { title: "", desc: DEFAULT_DESC, type: "website", image: "", jsonLd: null, content: "", article: null };

  if (r === "") { M.content = homeContent(await fetchNewsList(6)); return M; } // homepage

  try {
    if (r === "news" && id) {
      let n = null, dbOk = false;
      for (let a = 0; a < 3 && !dbOk; a++) {
        try { n = await News.findById(id).select("-bodyImage1 -bodyImage2").lean(); dbOk = true; }
        catch (e) { await new Promise((rz) => setTimeout(rz, 150)); }
      }
      if (n && n.status === "published") return articleMeta(n);
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
      M.content = newsListContent(rows, pg, total);
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

function articleMeta(n) {
  const desc = clip(n.metaDescription || cardSummary(n), 160);
  const coverUrl = mediaUrl("news", n._id, "cover", n.cover);
  const M = {
    title: n.title, desc, type: "article", image: coverUrl,
    content: articleContent(n, coverUrl),
    article: { published: n.publishedAt, modified: n.updatedAt || n.publishedAt, section: n.category },
  };
  M.jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": n.title,
    "description": desc,
    "image": coverUrl ? [coverUrl] : undefined,
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
function articleContent(n, coverUrl) {
  let dateStr = "";
  try { dateStr = new Date(n.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch (e) {}
  const cu = coverUrl != null ? coverUrl : mediaUrl("news", n._id, "cover", n.cover);
  const cover = cu ? `<figure class="cover"><img src="${esc(cu)}" alt="${esc(n.title)}"></figure>` : "";
  const tags = (n.tags || []).map((t) => `<span class="chip">#${esc(t)}</span>`).join(" ");
  const body = linkify(n.body || `<p>${esc(n.excerpt || "")}</p>`); // authored HTML (trusted)
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
  const page = Math.max(1, parseInt((req.query && req.query.page) || "1", 10) || 1);
  const M = await buildMeta(seg, page);
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
