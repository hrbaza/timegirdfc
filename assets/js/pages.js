/* =========================================================================
   Time Grid FC — Public pages
   Each handler receives the #tg-app element + route params, renders HTML,
   and wires its own events. Called by the router in app.js.
   ========================================================================= */
window.TG = window.TG || {};
TG.pages = (function () {
  const S = TG.store, U = TG.ui;
  const esc = U.esc, initials = U.initials, icon = U.icon;

  /* ---- shared bits ---- */
  const CAT = {
    "Match Analysis": { e: "📊", g: "135deg,#0b6b3a,#16a34a" },
    "Player Analysis": { e: "⭐", g: "135deg,#4338ca,#6366f1" },
    "Transfer News": { e: "🔄", g: "135deg,#b45309,#f2b134" },
    "General Football News": { e: "📰", g: "135deg,#0f766e,#14b8a6" },
    "World Cup News": { e: "🌍", g: "135deg,#9d174d,#ef4444" },
  };
  // kind sizes the image ("card", "feature" or "hero", see imgsrc.js); eager
  // marks the main image of the page, which loads first instead of lazily.
  function thumb(cat, url, emoji, alt, kind, eager) {
    const c = CAT[cat] || { e: emoji || "⚽", g: "135deg,#0b6b3a,#16a34a" };
    const src = window.TG_IMG ? TG_IMG.attrs(url, kind || "card") : `src="${esc(url)}"`;
    const load = eager ? `fetchpriority="high"` : `loading="lazy"`;
    if (url) return `<img ${src} alt="${esc(alt || "")}" ${load} decoding="async" onerror="this.parentNode.innerHTML='<div class=&quot;ggrad&quot; style=&quot;height:100%;display:grid;place-items:center;background:linear-gradient(${c.g});font-size:2.4rem&quot;>${c.e}</div>'">`;
    return `<div class="ggrad" style="height:100%;display:grid;place-items:center;background:linear-gradient(${c.g});font-size:2.6rem">${c.e}</div>`;
  }
  function crumbs(items) {
    return `<div class="crumbs">` + items.map((it, i) =>
      i < items.length - 1 ? `<a href="${it[1]}">${esc(it[0])}</a><span>›</span>` : `<span style="color:var(--text-soft)">${esc(it[0])}</span>`
    ).join("") + `</div>`;
  }
  function empty(msg) { return `<div class="empty"><div class="ball">⚽</div><p>${esc(msg)}</p></div>`; }

  // Excerpt/summary: use the article's excerpt, else derive from the first ~160
  // characters of the body so cards & meta descriptions are never empty.
  function summary(n, len) {
    len = len || 160;
    const s = (n.excerpt || "").trim();
    if (s) return s;
    const text = String(n.body || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return text.length > len ? text.slice(0, len - 1).trimEnd() + "…" : text;
  }

  /* ---- card renderers ---- */
  function newsCard(n) {
    return `<a class="card reveal" href="${S.newsHref(n)}">
      <div class="thumb">${thumb(n.category, n.cover)}<span class="tag chip">${esc(n.category)}</span></div>
      <div class="pad">
        <h3>${esc(n.title)}</h3>
        <p class="muted" style="font-size:.9rem;margin:0">${esc(summary(n))}</p>
        <div class="meta">${esc(TG_INFO.authorOf(n).name)} · ${U.timeAgo(n.publishedAt)}</div>
      </div></a>`;
  }
  function videoCard(v) {
    return `<a class="card reveal" href="${esc(v.url)}" target="_blank" rel="noopener" title="Opens on YouTube">
      <div class="thumb">${thumb(v.category, v.thumb, "▶")}<span class="tag chip">${esc(v.category)}</span>
        <div class="play-badge"><span>${icon("play")}</span></div></div>
      <div class="pad"><h3>${esc(v.title)}</h3>
        <p class="muted" style="font-size:.88rem;margin:0">${esc(v.desc || "")}</p>
        <div class="meta">▶ YouTube · ${U.timeAgo(v.addedAt)}</div></div></a>`;
  }
  function playerCard(p) {
    const c = S.country(p.country), t = S.team(p.club);
    return `<a class="card person reveal" href="/player/${p.id}">
      <div class="ph">${initials(p.name)}${p.photo ? `<img src="${esc(p.photo)}" alt="${esc(p.name)}" loading="lazy" onerror="this.remove()">` : ""}</div>
      <h3>${esc(p.name)}</h3>
      <div class="sub">${c ? U.flag(c.code) + " " : ""}${esc(p.pos)}${t ? " · " + esc(t.name) : ""}</div>
      <div style="margin-top:.5rem"><span class="chip">#${p.jersey}</span></div></a>`;
  }
  function teamCard(t) {
    const c = S.country(t.country);
    return `<a class="card person reveal" href="/team/${t.id}">
      <div class="ph" style="border-radius:18px">${initials(t.name)}${t.country ? U.flagFill(t.country) : (t.crest || "")}</div>
      <h3>${esc(t.name)}</h3>
      <div class="sub">${c ? esc(c.name) + " · " : ""}${esc(t.stadium)}</div>
      <div style="margin-top:.5rem"><span class="chip">Est. ${t.founded}</span></div></a>`;
  }
  function fixtureRow(f) {
    const h = S.team(f.home), a = S.team(f.away), lg = S.league(f.comp);
    const mid = f.status === "live"
      ? `<div class="score">${f.hs}–${f.as}</div><span class="chip live">LIVE</span>`
      : f.status === "finished"
        ? `<div class="score">${f.hs}–${f.as}</div><div class="comp">FT</div>`
        : `<div class="ko">${f.time}</div><div class="comp">${U.fmtDay(f.date)}</div>`;
    return `<div class="fixture reveal">
      <div class="team"><span class="crest">${h ? (h.crest || initials(h.name)) : "?"}</span>${h ? `<a href="/team/${h.id}">${esc(h.name)}</a>` : "TBD"}</div>
      <div class="mid">${mid}<div class="comp">${lg ? esc(lg.name) : ""}</div></div>
      <div class="team away"><span class="crest">${a ? (a.crest || initials(a.name)) : "?"}</span>${a ? `<a href="/team/${a.id}">${esc(a.name)}</a>` : "TBD"}</div>
    </div>`;
  }
  function transferRow(tr) {
    const p = tr.player ? S.player(tr.player) : null;
    return `<div class="fixture reveal" style="grid-template-columns:1fr auto 1fr">
      <div class="team">${p ? `<a href="/player/${p.id}"><b>${esc(tr.playerName)}</b></a>` : `<b>${esc(tr.playerName)}</b>`}</div>
      <div class="mid"><div class="ko">${icon("arrow")}</div><div class="comp">${esc(tr.type)}${tr.fee ? " · " + esc(tr.fee) : ""}</div><div class="comp">${U.fmtDate(tr.date)}</div></div>
      <div class="team away"><span>${esc(tr.from)} → <b>${esc(tr.to)}</b></span></div>
    </div>`;
  }

  /* =======================================================================
     HOME (FR-1)
     ======================================================================= */
  function home(app) {
    U.setMeta("", "Football news, match analysis & videos — the official companion to the Time Grid FC YouTube channel.");
    const feat = S.publishedNews()[0];
    // Latest News shows the most recent posts (including the newest), so a freshly
    // published blog appears here immediately.
    const latest = S.publishedNews().slice(0, 6);
    const vids = S.all("videos").slice(0, 3);

    app.innerHTML = `
      <section class="hero wrap">
        <div class="hero-grid">
          <div>
            <span class="eyebrow">Time Grid FC · Football Hub</span>
            <h1>Where football <span class="hl">lives</span>.<br>Football news &amp; analysis.</h1>
            <p class="lead">Daily football news and analysis, World Cup history — and every video from the Time Grid FC channel.</p>
            <div class="hero-cta">
              <a class="btn" href="/news">Read the latest ${icon("arrow")}</a>
              <a class="btn ghost" href="/videos">Watch videos</a>
            </div>
          </div>
          <div>
            ${feat ? `<a class="hero-card" href="${S.newsHref(feat)}">
              <div class="cover">${thumb(feat.category, feat.cover, "", feat.title, "feature", true)}<span class="hero-badge">Featured</span></div>
              <div class="body"><span class="chip">${esc(feat.category)}</span>
                <h3 style="margin:.5rem 0 .3rem;font-size:1.3rem">${esc(feat.title)}</h3>
                <p class="muted" style="margin:0;font-size:.92rem">${esc(feat.excerpt||"")}</p></div>
            </a>` : ""}
            <div class="hero-blur"></div>
          </div>
        </div>
      </section>

      <section class="wrap section" style="padding-top:0">
        <div class="section-head"><div><span class="eyebrow">News & Blog</span><h2>Latest News</h2></div><a class="btn ghost sm" href="/news">All news ${icon("arrow")}</a></div>
        <div class="grid cols-3">${latest.map(newsCard).join("")}</div>
      </section>

      ${vids.length ? `<section class="wrap section" style="padding-top:0">
        <div class="section-head"><div><span class="eyebrow">Videos</span><h2>From the Channel</h2></div><a class="btn ghost sm" href="/videos">All videos ${icon("arrow")}</a></div>
        <div class="grid cols-3">${vids.map(videoCard).join("")}</div>
      </section>` : ""}

      <section class="wrap section" style="padding-top:0">
        <div class="card reveal" style="padding:2rem;text-align:center;background:linear-gradient(135deg,var(--green-800),var(--green-600));color:#fff">
          <h2 style="color:#fff">Explore the football universe</h2>
          <p style="opacity:.92;max-width:52ch;margin-inline:auto">Catch up on the latest stories and the complete history of the World Cup.</p>
          <div class="hero-cta" style="justify-content:center;margin-top:1rem">
            <a class="btn gold" href="/news">Latest news</a>
            <a class="btn ghost" style="color:#fff;border-color:rgba(255,255,255,.5)" href="/worldcup">World Cup history</a>
          </div>
        </div>
      </section>`;
    U.observeReveals(app);
  }

  /* =======================================================================
     NEWS listing (FR-2) — filters + pagination
     ======================================================================= */
  function news(app) {
    // Page + category come from the URL (?page=N&cat=X) so every page is a real,
    // crawlable link. The global click interceptor turns clicks into SPA nav.
    const qp = new URLSearchParams(location.search);
    let cat = qp.get("cat") || "All";
    let page = Math.max(1, parseInt(qp.get("page"), 10) || 1);
    const SIZE = 12;
    const cats = ["All", ...S.newsCategories()];
    U.setMeta(page > 1 ? `Football News — page ${page}` : "Football News & Analysis", "The latest football news, transfer stories, match previews, reports and tactical analysis from Time Grid FC.");

    let list = S.publishedNews();
    if (cat !== "All") list = list.filter((n) => n.category === cat);
    const pages = Math.max(1, Math.ceil(list.length / SIZE));
    if (page > pages) page = pages;
    const slice = list.slice((page - 1) * SIZE, page * SIZE);

    const catHref = (c) => (c === "All" ? "/news" : `/news?cat=${encodeURIComponent(c)}`);
    const pageHref = (p) => `/news?page=${p}${cat !== "All" ? "&cat=" + encodeURIComponent(cat) : ""}`;
    const filters = cats.map((c) => `<a class="pill${c === cat ? " active" : ""}" href="${catHref(c)}">${esc(c)}</a>`).join("");
    let pager = "";
    if (pages > 1) {
      let nums = "";
      for (let p = 1; p <= pages; p++) nums += `<a class="${p === page ? "active" : ""}" href="${pageHref(p)}">${p}</a>`;
      pager = `${page > 1 ? `<a href="${pageHref(page - 1)}" rel="prev" aria-label="Previous page">‹</a>` : ""}${nums}${page < pages ? `<a href="${pageHref(page + 1)}" rel="next" aria-label="Next page">›</a>` : ""}`;
    }

    app.innerHTML = `
      <section class="wrap section">
        ${crumbs([["Home", "/"], ["News"]])}
        <div class="section-head"><div><span class="eyebrow">News & Blog</span><h1>Football News</h1></div></div>
        <div class="filters" id="news-filters">${filters}</div>
        <div class="grid cols-3" id="news-grid">${slice.length ? slice.map(newsCard).join("") : empty("No posts in this category yet.")}</div>
        <nav class="pager" id="news-pager" aria-label="Pagination">${pager}</nav>
      </section>`;
    U.observeReveals(app);
  }

  // Known mistyped article links in stored bodies → the correct article.
  const LINK_FIXES = { "/news/n-3irkrkh": "/news/n-drqk4s2" };
  // Sections that were removed from the site; links to them render as plain text.
  const DEAD_LINK = /^(https?:\/\/(www\.)?timegridfc\.com)?\/(player|players|team|teams|leagues|awards|transfers|schedule|daily)(\/|$|[?#])/i;
  const OWN_SITE = /^https?:\/\/(www\.)?timegridfc\.com(\/|$)/i;
  function fixLinks(html) {
    let s = String(html == null ? "" : html);
    for (const [bad, good] of Object.entries(LINK_FIXES)) s = s.split(bad).join(good);
    // Old id links (/news/n-abc1234) → the article's title URL, so no redirect hop.
    const byId = S.slugMap().byId;
    s = s.replace(/\/news\/(n-[a-z0-9]+)(?![a-z0-9-])/gi, (m, id) => (byId[id] ? "/news/" + byId[id] : m));
    s = s.replace(/\[([^\]\n]+)\]\(([^\s)]+)\)/g, (m, text, url) => (DEAD_LINK.test(url) ? text : m));
    return s.replace(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (m, url, text) => (DEAD_LINK.test(url) ? text : m));
  }
  // Turn inline Markdown links [text](url) into real, underlined <a> links.
  // Lets writers embed a link right inside the sentence, e.g. [Messi](/news/n-v415g7w).
  // Links to timegridfc.com stay in the same tab; other sites open in a new tab.
  function linkify(html) {
    return fixLinks(html).replace(
      /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g,
      (m, text, url) => {
        const external = /^https?:\/\//i.test(url) && !OWN_SITE.test(url);
        return `<a href="${url}"${external ? ' target="_blank" rel="noopener"' : ""}>${text}</a>`;
      }
    );
  }

  /* ---- NEWS post + comments (FR-2, FR-11) — SEO/AdSense-optimised article ---- */
  function readingTime(html) {
    const words = (html || "").replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }
  async function newsPost(app, params) {
    // URL segment is the title slug; an old id URL is swapped for the slug URL in place.
    const key = S.resolveNewsKey(params.id);
    if (key.redirect && location.protocol !== "file:") history.replaceState({}, "", "/news/" + key.redirect + location.search + location.hash);
    let n = S.news1(key.id);
    // The bootstrap list has no article bodies, so the body is fetched here.
    // While it loads, keep the server-rendered article if it is this one;
    // otherwise (navigating from another page) show the loader.
    if (n && n.body == null) {
      const h1 = app.querySelector(".article h1");
      if (!h1 || h1.textContent.trim() !== String(n.title || "").trim()) {
        app.innerHTML = `<section class="wrap section"><div class="loader"><div class="ball">⚽</div></div></section>`;
        window.scrollTo(0, 0);
      }
      n = null;
    }
    if (!n) {
      // Not in this browser's cache (brand-new article, or bootstrap not loaded
      // yet). Fetch it by id. CRUCIAL for SEO: on a network/timeout failure we
      // must NEVER clobber the server-rendered article — doing so made Google's
      // renderer see "Article not found" and flag the page as a Soft 404.
      const res = await S.fetchArticle(key.id);
      if (res && res.article) n = res.article;
      else if (res && res.notFound) { app.innerHTML = `<section class="wrap section">${empty("Article not found.")}</section>`; return; }
      else { if (!app.querySelector(".article")) app.innerHTML = `<section class="wrap section"><div class="loader"><div class="ball">⚽</div></div></section>`; return; }
    }
    if (n.status && n.status !== "published") { app.innerHTML = `<section class="wrap section">${empty("Article not found.")}</section>`; return; }
    renderArticle(app, n);
  }

  function renderArticle(app, n) {
    // Full SEO: title, meta description, Open Graph, Twitter, canonical, JSON-LD (schema.org).
    U.setArticleSEO(n);

    const mins = readingTime(n.body);
    const au = TG_INFO.authorOf(n); // byline: the editor for default-author posts
    // Same picks as the server: 3 newest + 3 older, same category first.
    const all = S.publishedNews().filter((x) => x.id !== n.id);
    const sameCat = all.filter((x) => x.category === n.category);
    const pool = sameCat.length >= 6 ? sameCat : sameCat.concat(all.filter((x) => x.category !== n.category).slice(0, 30));
    const rel = window.TG_LINKMAP && TG_LINKMAP.related ? TG_LINKMAP.related(n.id, pool, 6) : pool.slice(0, 3);
    const updated = n.updatedAt && n.updatedAt !== n.publishedAt;

    // Add ids to <h2> headings and build a table of contents (router-safe anchors).
    const LM = window.TG_LINKMAP;
    let bodyHtml = linkify(LM ? LM.apply(n.id || n._id, n.body) : n.body) ||`<p>${esc(n.excerpt || "")}</p>`;
    let toc = "";
    try {
      const tmp = document.createElement("div"); tmp.innerHTML = bodyHtml;
      const heads = [...tmp.querySelectorAll("h2")];
      heads.forEach((h, i) => { h.id = "sec-" + (i + 1); });
      if (heads.length >= 3) {
        toc = `<nav class="toc" aria-label="Table of contents"><h4>In this article</h4><ol>` +
          heads.map((h, i) => `<li><a href="#sec-${i + 1}" onclick="event.preventDefault();var e=document.getElementById('sec-${i + 1}');if(e)e.scrollIntoView({behavior:'smooth'})">${esc(h.textContent)}</a></li>`).join("") +
          `</ol></nav>`;
      }

      // Insert up to two in-article images, spread through the body.
      const inImgs = [];
      if (n.bodyImage1) inImgs.push({ src: n.bodyImage1, cap: n.bodyImage1Caption });
      if (n.bodyImage2) inImgs.push({ src: n.bodyImage2, cap: n.bodyImage2Caption });
      const blocks = [...tmp.children];
      if (inImgs.length && blocks.length) {
        const denom = inImgs.length + 1;
        const makeFig = (im) => {
          const fig = document.createElement("figure");
          fig.className = "in-body";
          fig.innerHTML = `<img ${window.TG_IMG ? TG_IMG.attrs(im.src, "hero") : `src="${esc(im.src)}"`} alt="${esc(im.cap || n.title)}" loading="lazy" decoding="async">` +
            (im.cap ? `<figcaption class="muted">${esc(im.cap)}</figcaption>` : "");
          return fig;
        };
        // Insert from the last position first so earlier block references stay valid.
        inImgs
          .map((im, i) => ({ im, pos: Math.min(blocks.length, Math.max(1, Math.round((blocks.length * (i + 1)) / denom))) }))
          .sort((a, b) => b.pos - a.pos)
          .forEach(({ im, pos }) => { tmp.insertBefore(makeFig(im), blocks[pos] || null); });
      }

      bodyHtml = tmp.innerHTML;
    } catch (e) { /* keep raw body */ }

    app.innerHTML = `
      <article class="wrap section article">
        ${crumbs([["Home", "/"], ["News", "/news"], [n.category, "/news"], [n.title]])}
        <span class="badge-cat">${esc(n.category)}</span>
        <h1>${esc(n.title)}</h1>
        <div class="byline">
          <span class="chip">${initials(au.name)}</span>
          <span>By ${au.url ? `<a href="${au.url}" rel="author"><b>${esc(au.name)}</b></a>, ${esc(au.role)}` : `<b>${esc(au.name)}</b>`}</span> ·
          <span>Published ${U.fmtDate(n.publishedAt)}</span>
          ${updated ? ` · <span>Updated ${U.fmtDate(n.updatedAt)}</span>` : ""}
          · <span>${mins} min read</span>
        </div>
        <div class="tag-row">${(n.tags || []).map((t) => `<span class="chip">#${esc(t)}</span>`).join(" ")}</div>
        <figure class="cover">${thumb(n.category, n.cover, "", n.title, "hero", true)}<figcaption class="muted">${esc(n.title)}</figcaption></figure>
        ${n.excerpt ? `<p class="lede">${esc(n.excerpt)}</p>` : ""}
        ${toc}
        <div class="content">${bodyHtml}</div>
        <div class="author-box card">
          <div class="av">${initials(au.name)}</div>
          <div><div class="who">${esc(au.name)}${au.role ? ", " + esc(au.role) : ""}</div><p class="muted" style="margin:.2rem 0 0">${au.url ? esc(TG_INFO.AUTHOR.bio) : "Football writing for Time Grid FC."} <a href="${au.url || "/about"}">About us</a> · <a href="/contact">Contact</a></p></div>
        </div>
        <div id="comments"></div>
      </article>
      ${rel.length ? `<section class="wrap section" style="padding-top:0"><div class="section-head"><h2>Related articles</h2></div><div class="grid cols-3">${rel.map(newsCard).join("")}</div></section>` : ""}`;
    renderComments(n.id);
    U.observeReveals(app);
  }

  function renderComments(postId) {
    const host = document.getElementById("comments");
    if (!host) return;
    const u = S.currentUser();
    const list = S.commentsFor(postId);
    const form = u
      ? `<form id="cform" style="margin:1rem 0 1.4rem"><div class="field"><textarea class="textarea" id="ctext" placeholder="Share your thoughts, ${esc(u.name)}…" required></textarea></div><button class="btn" type="submit">Post comment</button></form>`
      : `<div class="card" style="padding:1.2rem;margin:1rem 0 1.4rem;text-align:center"><p style="margin:.2rem 0">💬 <b>Sign in to join the conversation.</b></p><a class="btn sm" href="/signin">Sign In</a> <a class="btn sm ghost" href="/signup">Create account</a></div>`;
    host.innerHTML = `<div class="section" style="padding-bottom:0"><div class="section-head"><h2 style="font-size:1.3rem">Comments <span class="muted" style="font-weight:400">(${list.length})</span></h2></div>${form}
      <div id="clist">${list.length ? list.map((c) => `
        <div class="comment"><div class="av">${initials(c.author)}</div><div><div><span class="who">${esc(c.author)}</span> <span class="when">· ${U.timeAgo(c.createdAt)}</span></div><p style="margin:.2rem 0 0">${esc(c.text)}</p></div></div>`).join("") : `<p class="muted">Be the first to comment.</p>`}</div></div>`;
    const f = document.getElementById("cform");
    if (f) f.onsubmit = async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector("button[type=submit]"); btn.disabled = true;
      const res = await S.addComment(postId, document.getElementById("ctext").value);
      btn.disabled = false;
      if (res.error) { U.toast(res.error, "err"); return; }
      U.toast("Comment posted", "ok"); renderComments(postId);
    };
  }

  /* =======================================================================
     PLAYERS (FR-4) — country chooser → list → profile
     ======================================================================= */
  function players(app) {
    U.setMeta("Players by Country", "Browse the Time Grid FC player database organised by country.");
    const countries = S.countriesWithPlayers().filter((c) => c.count > 0);
    app.innerHTML = `
      <section class="wrap section">
        ${crumbs([["Home", "/"], ["Players"]])}
        <div class="section-head"><div><span class="eyebrow">Players Database</span><h2>Choose a country</h2><p class="muted" style="margin:0">Select a nation to see every player from that country in our database.</p></div></div>
        <div class="grid auto">${countries.map((c) => `
          <a class="country-tile reveal" href="/players/${c.code}">
            <span class="fe">${U.flag(c.code, 34)}</span>
            <span><span class="n">${esc(c.name)}</span><br><span class="c">${c.count} player${c.count>1?"s":""}</span></span>
          </a>`).join("")}</div>
      </section>`;
    U.observeReveals(app);
  }

  function playersCountry(app, params) {
    const c = S.country(params.code);
    if (!c) { app.innerHTML = `<section class="wrap section">${empty("Country not found.")}</section>`; return; }
    U.setMeta(`${c.name} Players`, `All ${c.name} players in the Time Grid FC database.`);
    const list = S.playersByCountry(c.code);
    app.innerHTML = `
      <section class="wrap section">
        ${crumbs([["Home", "/"], ["Players", "/players"], [c.name]])}
        <div class="section-head"><div><span class="eyebrow">${U.flag(c.code)} ${esc(c.name)}</span><h2>${list.length} Player${list.length>1?"s":""}</h2></div></div>
        <div class="search-box" style="max-width:420px;margin-bottom:1.2rem"><span>${icon("search")}</span><input class="input" id="pfilter" placeholder="Search by name, position or club…" autocomplete="off"></div>
        <div class="grid auto" id="pgrid"></div>
      </section>`;
    function render(q) {
      q = (q || "").toLowerCase();
      const filtered = list.filter((p) => {
        const t = S.team(p.club);
        return p.name.toLowerCase().includes(q) || p.pos.toLowerCase().includes(q) || (t && t.name.toLowerCase().includes(q));
      });
      const grid = document.getElementById("pgrid");
      grid.innerHTML = filtered.length ? filtered.map(playerCard).join("") : empty("No players match your search.");
      U.observeReveals(grid);
    }
    document.getElementById("pfilter").addEventListener("input", (e) => render(e.target.value));
    render("");
  }

  function player(app, params) {
    const p = S.player(params.id);
    if (!p) { app.innerHTML = `<section class="wrap section">${empty("Player not found.")}</section>`; return; }
    const c = S.country(p.country), t = S.team(p.club);
    U.setMeta(p.name, `${p.name} — ${p.pos}${t ? ", " + t.name : ""}. Profile, career history, stats and honours.`);
    const age = Math.floor((Date.now() - new Date(p.dob)) / (365.25 * 86400000));
    const honors = S.awardsForPlayer(p.id);
    const totals = (p.stats || []).reduce((a, s) => ({ apps: a.apps + (s.apps||0), goals: a.goals + (s.goals||0), assists: a.assists + (s.assists||0) }), { apps: 0, goals: 0, assists: 0 });
    app.innerHTML = `
      <section class="wrap section">
        ${crumbs([["Home", "/"], ["Players", "/players"], [c ? c.name : "", c ? "/players/" + c.code : "/players"], [p.name]])}
        <div class="profile-head reveal">
          <div class="photo">${initials(p.name)}${p.photo ? `<img src="${esc(p.photo)}" alt="${esc(p.name)}" onerror="this.remove()">` : ""}</div>
          <div>
            <span class="chip">#${p.jersey} · ${esc(p.pos)}</span>
            <h1>${esc(p.name)}</h1>
            <div class="profile-meta">
              <div><div class="k">Nationality</div><div class="v">${c ? U.flag(c.code) + " " + esc(c.name) : "—"}</div></div>
              <div><div class="k">Age</div><div class="v">${age} yrs</div></div>
              <div><div class="k">Born</div><div class="v">${U.fmtDate(p.dob)}</div></div>
              <div><div class="k">Club</div><div class="v">${t ? `<a href="/team/${t.id}">${esc(t.name)}</a>` : "—"}</div></div>
            </div>
          </div>
        </div>

        <div class="section" style="padding-bottom:0"><div class="section-head"><h2 style="font-size:1.3rem">Career totals</h2></div>
          <div class="stat-tiles">
            <div class="stat-tile"><div class="n">${totals.apps}</div><div class="l">Appearances*</div></div>
            <div class="stat-tile"><div class="n">${totals.goals}</div><div class="l">Goals*</div></div>
            <div class="stat-tile"><div class="n">${totals.assists}</div><div class="l">Assists*</div></div>
            <div class="stat-tile"><div class="n">${honors.length}</div><div class="l">Major honours</div></div>
          </div><p class="help" style="margin-top:.5rem">*Aggregated from recorded seasons below.</p>
        </div>

        <div class="grid cols-2" style="align-items:start;margin-top:1.4rem">
          <div>
            <div class="section-head"><h2 style="font-size:1.2rem">Career history</h2></div>
            <div class="table-wrap"><table class="tg"><thead><tr><th>Club</th><th>Years</th></tr></thead><tbody>
              ${(p.career||[]).map((h) => `<tr><td>${esc(h.club)}</td><td>${esc(h.years)}</td></tr>`).join("") || `<tr><td colspan="2" class="muted">No data.</td></tr>`}
            </tbody></table></div>
          </div>
          <div>
            <div class="section-head"><h2 style="font-size:1.2rem">🏆 Honours & Awards</h2></div>
            ${honors.length ? `<div class="table-wrap"><table class="tg"><thead><tr><th>Award</th><th>Year</th></tr></thead><tbody>
              ${honors.map((h) => `<tr><td>${h.icon} <a href="/awards/${h.awardId}">${esc(h.award)}</a></td><td class="rank">${h.year}</td></tr>`).join("")}
            </tbody></table></div>` : `<div class="card" style="padding:1.2rem"><p class="muted" style="margin:0">No individual awards recorded for this player yet.</p></div>`}
          </div>
        </div>

        <div class="section" style="padding-bottom:0"><div class="section-head"><h2 style="font-size:1.2rem">Season statistics</h2></div>
          <div class="table-wrap"><table class="tg"><thead><tr><th>Season</th><th>Club</th><th>Apps</th><th>Goals</th><th>Assists</th></tr></thead><tbody>
            ${(p.stats||[]).map((s) => `<tr><td>${esc(s.season)}</td><td>${esc(s.club)}</td><td>${s.apps}</td><td>${s.goals}</td><td>${s.assists}</td></tr>`).join("") || `<tr><td colspan="5" class="muted">No statistics recorded.</td></tr>`}
          </tbody></table></div>
        </div>
      </section>`;
    U.observeReveals(app);
  }

  /* =======================================================================
     TEAMS (FR-5)
     ======================================================================= */
  function teams(app) {
    U.setMeta("Teams & Clubs", "Browse clubs by country and league in the Time Grid FC database.");
    let filter = "All";
    const leagues = S.all("leagues").filter((l) => S.all("teams").some((t) => t.league === l.id));
    app.innerHTML = `
      <section class="wrap section">
        ${crumbs([["Home", "/"], ["Teams"]])}
        <div class="section-head"><div><span class="eyebrow">Teams & Clubs</span><h2>Clubs & Teams</h2></div></div>
        <div class="filters" id="tfilters">
          <button class="pill active" data-l="All">All</button>
          ${leagues.map((l) => `<button class="pill" data-l="${l.id}">${U.compFlag(l)} ${esc(l.name)}</button>`).join("")}
        </div>
        <div class="grid auto" id="tgrid"></div>
      </section>`;
    function render() {
      let list = S.all("teams");
      if (filter !== "All") list = list.filter((t) => t.league === filter);
      const grid = document.getElementById("tgrid");
      grid.innerHTML = list.length ? list.map(teamCard).join("") : empty("No teams in this competition.");
      U.observeReveals(grid);
    }
    document.getElementById("tfilters").querySelectorAll(".pill").forEach((b) => b.onclick = () => {
      document.querySelectorAll("#tfilters .pill").forEach((x) => x.classList.remove("active"));
      b.classList.add("active"); filter = b.dataset.l; render();
    });
    render();
  }

  function team(app, params) {
    const t = S.team(params.id);
    if (!t) { app.innerHTML = `<section class="wrap section">${empty("Team not found.")}</section>`; return; }
    const c = S.country(t.country), lg = S.league(t.league);
    U.setMeta(t.name, `${t.name} — squad, stadium, honours and club profile.`);
    const roster = S.squad(t.id);
    app.innerHTML = `
      <section class="wrap section">
        ${crumbs([["Home", "/"], ["Teams", "/teams"], [t.name]])}
        <div class="profile-head reveal">
          <div class="photo" style="font-size:2.6rem">${initials(t.name)}${t.country ? U.flagFill(t.country) : (t.crest || "")}</div>
          <div>
            <span class="chip">${c ? U.flag(c.code) + " " + esc(c.name) : ""}${lg ? " · " + esc(lg.name) : ""}</span>
            <h1>${esc(t.name)}</h1>
            <div class="profile-meta">
              <div><div class="k">Founded</div><div class="v">${t.founded}</div></div>
              <div><div class="k">Stadium</div><div class="v">${esc(t.stadium)}</div></div>
              <div><div class="k">Squad size</div><div class="v">${roster.length}</div></div>
              ${lg ? `<div><div class="k">League</div><div class="v"><a href="/leagues/${lg.id}">${esc(lg.name)}</a></div></div>` : ""}
            </div>
          </div>
        </div>

        <div class="grid cols-2" style="align-items:start;margin-top:1.4rem">
          <div><div class="section-head"><h2 style="font-size:1.2rem">🏆 Major honours</h2></div>
            <div class="card" style="padding:1.2rem"><div style="display:flex;flex-wrap:wrap;gap:.5rem">${(t.honors||[]).map((h)=>`<span class="chip gold">${esc(h)}</span>`).join("") || `<span class="muted">No honours recorded.</span>`}</div></div>
          </div>
          <div><div class="section-head"><h2 style="font-size:1.2rem">Squad in database</h2></div>
            ${roster.length ? `<div class="grid auto">${roster.map(playerCard).join("")}</div>` : `<div class="card" style="padding:1.2rem"><p class="muted" style="margin:0">No players from this club are in the database yet.</p></div>`}
          </div>
        </div>
      </section>`;
    U.observeReveals(app);
  }

  /* =======================================================================
     SCHEDULE (FR-6)
     ======================================================================= */
  function schedule(app) {
    U.setMeta("Match Schedule", "Today's matches and upcoming fixtures grouped by competition.");
    let comp = "All";
    const comps = S.all("leagues").filter((l) => S.all("fixtures").some((f) => f.comp === l.id));
    app.innerHTML = `
      <section class="wrap section">
        ${crumbs([["Home", "/"], ["Schedule"]])}
        <div class="section-head"><div><span class="eyebrow">Fixtures</span><h2>Match Schedule</h2></div></div>
        <div class="filters" id="sfilters">
          <button class="pill active" data-c="All">All competitions</button>
          ${comps.map((l) => `<button class="pill" data-c="${l.id}">${U.compFlag(l)} ${esc(l.name)}</button>`).join("")}
        </div>
        <div id="sched-body"></div>
      </section>`;
    function group(list) {
      // group by date
      const byDate = {};
      list.forEach((f) => { (byDate[f.date] = byDate[f.date] || []).push(f); });
      return Object.keys(byDate).sort().map((d) => `
        <div class="section" style="padding-block:1rem 0"><h3 style="font-size:1.05rem;margin-bottom:.7rem">${U.fmtDay(d)} <span class="muted" style="font-weight:400;font-size:.85rem">· ${U.fmtDate(d)}</span></h3>
        <div class="grid cols-2">${byDate[d].map(fixtureRow).join("")}</div></div>`).join("");
    }
    function render() {
      let up = S.fixturesUpcoming(), fin = S.fixturesRecent();
      if (comp !== "All") { up = up.filter((f) => f.comp === comp); fin = fin.filter((f) => f.comp === comp); }
      const body = document.getElementById("sched-body");
      body.innerHTML =
        `<div class="section-head" style="margin-top:1rem"><h2 style="font-size:1.15rem">Upcoming</h2></div>` +
        (up.length ? group(up) : empty("No upcoming fixtures for this competition.")) +
        `<div class="section-head" style="margin-top:2rem"><h2 style="font-size:1.15rem">Recent results</h2></div>` +
        (fin.length ? `<div class="grid cols-2">${fin.map(fixtureRow).join("")}</div>` : `<p class="muted">No recent results.</p>`);
      U.observeReveals(body);
    }
    document.getElementById("sfilters").querySelectorAll(".pill").forEach((b) => b.onclick = () => {
      document.querySelectorAll("#sfilters .pill").forEach((x) => x.classList.remove("active"));
      b.classList.add("active"); comp = b.dataset.c; render();
    });
    render();
  }

  /* =======================================================================
     LEAGUES (FR-7)
     ======================================================================= */
  function leagues(app) {
    U.setMeta("Leagues & Competitions", "Champions history and all-time honours for the world's biggest competitions.");
    const headline = ["l-premier-league","l-ucl","l-bundesliga","l-serie-a","l-mls","l-nations-league","l-fa-cup","l-efl-cup"];
    const list = headline.map((id) => S.league(id)).filter(Boolean);
    app.innerHTML = `
      <section class="wrap section">
        ${crumbs([["Home", "/"], ["Leagues"]])}
        <div class="section-head"><div><span class="eyebrow">Competitions</span><h2>Leagues & Competitions</h2></div></div>
        <div class="grid cols-3">${list.map((l) => {
          const champ = (l.champions || [])[0];
          return `<a class="card reveal" href="/leagues/${l.id}"><div class="pad">
            <div style="font-size:2rem">${U.compFlag(l, 40)}</div>
            <h3>${esc(l.name)}</h3>
            <div class="meta">${esc(l.type)} · ${esc(l.country)}</div>
            ${champ ? `<div style="margin-top:.5rem"><span class="chip gold">Current: ${esc(champ.team)}</span></div>` : ""}
          </div></a>`;
        }).join("")}</div>
      </section>`;
    U.observeReveals(app);
  }

  function league(app, params) {
    const l = S.league(params.id);
    if (!l) { app.innerHTML = `<section class="wrap section">${empty("Competition not found.")}</section>`; return; }
    U.setMeta(l.name, `${l.name} — winners history and all-time titles.`);
    const table = S.allTimeTable(l);
    const champ = (l.champions || [])[0];
    app.innerHTML = `
      <section class="wrap section">
        ${crumbs([["Home", "/"], ["Leagues", "/leagues"], [l.name]])}
        <div class="profile-head reveal">
          <div class="photo" style="font-size:3rem;background:linear-gradient(135deg,var(--green-800),var(--green-600))">${U.compFlag(l, 52)}</div>
          <div><span class="chip">${esc(l.type)} · ${esc(l.country)}</span><h1>${esc(l.name)}</h1>
          ${champ ? `<div class="profile-meta"><div><div class="k">Reigning champion</div><div class="v">🏆 ${esc(champ.team)} (${esc(champ.season)})</div></div></div>` : ""}</div>
        </div>
        <div class="grid cols-2" style="align-items:start;margin-top:1.4rem">
          <div><div class="section-head"><h2 style="font-size:1.2rem">Winners history</h2></div>
            <div class="table-wrap"><table class="tg"><thead><tr><th>Season</th><th>Champion</th></tr></thead><tbody>
              ${(l.champions||[]).map((c) => `<tr><td>${esc(c.season)}</td><td><b>${esc(c.team)}</b></td></tr>`).join("")}
            </tbody></table></div>
          </div>
          <div><div class="section-head"><h2 style="font-size:1.2rem">All-time titles</h2></div>
            <div class="table-wrap"><table class="tg"><thead><tr><th>#</th><th>Club</th><th>Titles</th></tr></thead><tbody>
              ${table.map((r, i) => `<tr><td class="rank">${i+1}</td><td>${esc(r.team)}</td><td><b>${r.titles}</b></td></tr>`).join("")}
            </tbody></table></div><p class="help" style="margin-top:.5rem">Ranked from recorded seasons in the database.</p>
          </div>
        </div>
      </section>`;
    U.observeReveals(app);
  }

  /* =======================================================================
     WORLD CUP (FR-8)
     ======================================================================= */
  function worldcup(app) {
    U.setMeta("World Cup History: Every Winner & Host", "Every FIFA World Cup, men's and women's: hosts, champions, runners-up and the all-time winners table.");
    let type = "men";
    app.innerHTML = `
      <section class="wrap section">
        ${crumbs([["Home", "/"], ["World Cup"]])}
        <div class="section-head"><div><span class="eyebrow">World Cup</span><h2>FIFA World Cup History</h2></div></div>
        <div class="filters" id="wcfilters">
          <button class="pill active" data-t="men">🏆 Men's World Cup</button>
          <button class="pill" data-t="women">🏆 Women's World Cup</button>
        </div>
        <div id="wc-body"></div>
      </section>`;
    function render() {
      const eds = S.all("worldcups").filter((w) => w.type === type).sort((a, b) => b.year - a.year);
      const table = S.worldCupTable(type);
      const latest = eds[0];
      document.getElementById("wc-body").innerHTML = `
        ${latest ? `<div class="card reveal" style="padding:1.4rem;margin-bottom:1.4rem;background:linear-gradient(135deg,var(--gold-500),#b45309);color:#241a02">
          <div class="chip" style="background:rgba(0,0,0,.15)">${latest.year} · ${esc(latest.host)}</div>
          <h2 style="margin:.4rem 0;color:#241a02">🏆 ${esc(latest.champion)}</h2>
          <p style="margin:0">Runner-up: ${esc(latest.runnerUp)}</p></div>` : ""}
        <div class="grid cols-2" style="align-items:start">
          <div><div class="section-head"><h2 style="font-size:1.2rem">All editions</h2></div>
            <div class="table-wrap"><table class="tg"><thead><tr><th>Year</th><th>Host</th><th>Champion</th><th>Runner-up</th></tr></thead><tbody>
              ${eds.map((w) => `<tr><td class="rank">${w.year}</td><td>${esc(w.host)}</td><td><b>${esc(w.champion)}</b></td><td>${esc(w.runnerUp)}</td></tr>`).join("")}
            </tbody></table></div>
          </div>
          <div><div class="section-head"><h2 style="font-size:1.2rem">All-time winners</h2></div>
            <div class="table-wrap"><table class="tg"><thead><tr><th>#</th><th>Country</th><th>Titles</th></tr></thead><tbody>
              ${table.map((r, i) => `<tr><td class="rank">${i+1}</td><td>${esc(r.country)}</td><td><b>${r.titles}</b></td></tr>`).join("")}
            </tbody></table></div>
          </div>
        </div>`;
      U.observeReveals(document.getElementById("wc-body"));
    }
    document.getElementById("wcfilters").querySelectorAll(".pill").forEach((b) => b.onclick = () => {
      document.querySelectorAll("#wcfilters .pill").forEach((x) => x.classList.remove("active"));
      b.classList.add("active"); type = b.dataset.t; render();
    });
    render();
  }

  /* =======================================================================
     AWARDS (FR-9)
     ======================================================================= */
  function awards(app) {
    U.setMeta("Individual Awards", "The Ballon d'Or and major individual football honours, with full winners history.");
    const list = S.all("awards");
    app.innerHTML = `
      <section class="wrap section">
        ${crumbs([["Home", "/"], ["Awards"]])}
        <div class="section-head"><div><span class="eyebrow">Awards</span><h2>Individual Awards</h2></div></div>
        <div class="grid cols-3">${list.map((a) => {
          const w = (a.winners || [])[0];
          return `<a class="card reveal" href="/awards/${a.id}"><div class="pad">
            <div style="font-size:2.4rem">${a.icon}</div><h3>${esc(a.name)}</h3>
            <p class="muted" style="font-size:.88rem;margin:0">${esc(a.desc)}</p>
            ${w ? `<div style="margin-top:.5rem"><span class="chip gold">Latest: ${esc(w.playerName)} (${w.year})</span></div>` : ""}
          </div></a>`;
        }).join("")}</div>
      </section>`;
    U.observeReveals(app);
  }

  function award(app, params) {
    const a = S.award(params.id);
    if (!a) { app.innerHTML = `<section class="wrap section">${empty("Award not found.")}</section>`; return; }
    U.setMeta(a.name, `${a.name} — full winners history.`);
    app.innerHTML = `
      <section class="wrap section">
        ${crumbs([["Home", "/"], ["Awards", "/awards"], [a.name]])}
        <div class="profile-head reveal">
          <div class="photo" style="font-size:3rem;background:linear-gradient(135deg,var(--gold-500),#b45309)">${a.icon}</div>
          <div><span class="chip gold">Individual Award</span><h1>${esc(a.name)}</h1><p class="muted" style="margin:.3rem 0 0;max-width:52ch">${esc(a.desc)}</p></div>
        </div>
        <div class="section" style="padding-bottom:0"><div class="section-head"><h2 style="font-size:1.2rem">Winners history</h2></div>
          <div class="table-wrap"><table class="tg"><thead><tr><th>Year</th><th>Player</th><th>Club at the time</th></tr></thead><tbody>
            ${(a.winners||[]).map((w) => `<tr><td class="rank">${w.year}</td><td>${w.player ? `<a href="/player/${w.player}"><b>${esc(w.playerName)}</b></a>` : `<b>${esc(w.playerName)}</b>`}</td><td>${esc(w.club)}</td></tr>`).join("")}
          </tbody></table></div>
        </div>
      </section>`;
    U.observeReveals(app);
  }

  /* =======================================================================
     TRANSFERS (FR-10)
     ======================================================================= */
  function transfers(app) {
    U.setMeta("Transfer News", "The latest football transfers — permanent deals and loans across the biggest clubs.");
    app.innerHTML = `
      <section class="wrap section">
        ${crumbs([["Home", "/"], ["Transfers"]])}
        <div class="section-head"><div><span class="eyebrow">Transfers</span><h2>Transfer Feed</h2></div></div>
        <div class="search-box" style="max-width:420px;margin-bottom:1.2rem"><span>${icon("search")}</span><input class="input" id="trf" placeholder="Filter by player or club…" autocomplete="off"></div>
        <div class="grid" style="gap:.7rem" id="trlist"></div>
      </section>`;
    const list = S.all("transfers").slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    function render(q) {
      q = (q || "").toLowerCase();
      const f = list.filter((tr) => tr.playerName.toLowerCase().includes(q) || tr.from.toLowerCase().includes(q) || tr.to.toLowerCase().includes(q));
      const el = document.getElementById("trlist");
      el.innerHTML = f.length ? f.map(transferRow).join("") : empty("No transfers match your filter.");
      U.observeReveals(el);
    }
    document.getElementById("trf").addEventListener("input", (e) => render(e.target.value));
    render("");
  }

  /* =======================================================================
     VIDEOS (FR-3)
     ======================================================================= */
  function videos(app) {
    U.setMeta("Football Videos & Match Analysis", "Match analysis, player breakdowns and football news videos from the Time Grid FC YouTube channel.");
    let cat = "All";
    const cats = ["All", "Match Analysis", "Player Analysis", "News"];
    app.innerHTML = `
      <section class="wrap section">
        ${crumbs([["Home", "/"], ["Videos"]])}
        <div class="section-head"><div><span class="eyebrow">Videos</span><h2>Time Grid FC on YouTube</h2><p class="muted" style="margin:0">Clicking any video opens it on the Time Grid FC channel.</p></div>
          <a class="btn gold sm" href="https://www.youtube.com/@timegrid_fc" target="_blank" rel="noopener">▶ Visit channel</a></div>
        <div class="filters" id="vfilters">${cats.map((c) => `<button class="pill${c==="All"?" active":""}" data-c="${esc(c)}">${esc(c)}</button>`).join("")}</div>
        <div class="grid cols-3" id="vgrid"></div>
      </section>`;
    function render() {
      let list = S.all("videos").slice().sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
      if (cat !== "All") list = list.filter((v) => v.category === cat);
      const grid = document.getElementById("vgrid");
      grid.innerHTML = list.length ? list.map(videoCard).join("") : empty("No videos in this category.");
      U.observeReveals(grid);
    }
    document.getElementById("vfilters").querySelectorAll(".pill").forEach((b) => b.onclick = () => {
      document.querySelectorAll("#vfilters .pill").forEach((x) => x.classList.remove("active"));
      b.classList.add("active"); cat = b.dataset.c; render();
    });
    render();
  }

  /* =======================================================================
     ABOUT / CONTACT
     ======================================================================= */
  /* ---- About / Contact / Privacy / Terms: text from infopages.js (shared with the server) ---- */
  function infoPage(app, key) {
    const pg = TG_INFO.PAGES[key];
    U.setMeta(pg.title, pg.desc);
    app.innerHTML = `
      <section class="wrap section article">
        ${crumbs([["Home", "/"], [pg.title]])}
        <span class="eyebrow">${pg.eyebrow}</span>
        <h1>${pg.h1}</h1>
        <div class="content">${pg.html}</div>
      </section>`;
    if (location.hash) { const el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView(); }
  }
  function about(app) { infoPage(app, "about"); }
  function privacy(app) { infoPage(app, "privacy"); }
  function terms(app) { infoPage(app, "terms"); }

  /* ---- Contact: the form posts to /api/contact, which emails the team ---- */
  function contact(app) {
    infoPage(app, "contact");
    const form = document.getElementById("contact-form");
    const status = document.getElementById("cf-status");
    const btn = form.querySelector('button[type="submit"]');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(form).entries());
      const say = (msg, ok) => { status.textContent = msg; status.style.color = ok ? "var(--primary)" : "var(--danger, #ef4444)"; };
      if (!f.name.trim() || !/^\S+@\S+\.\S+$/.test(f.email.trim()) || f.message.trim().length < 10) {
        return say("Please add your name, a valid email and a message of at least 10 characters.");
      }
      btn.disabled = true; say("Sending…", true);
      try {
        await TG.api.request("/contact", { method: "POST", body: f, timeout: 15000 });
        form.reset(); say("Thanks! Your message has been sent. We usually reply within 48 hours.", true);
      } catch (err) {
        say((err && err.message) || "Your message could not be sent. Please email us at " + TG_INFO.EMAIL + ".");
      } finally { btn.disabled = false; }
    };
  }

  /* =======================================================================
     AUTH: sign in / sign up / account (FR-11)
     ======================================================================= */
  function signin(app) {
    if (S.currentUser()) { U.go("/account"); return; }
    U.setMeta("Sign In");
    app.innerHTML = `
      <section class="wrap auth-wrap"><div class="auth-card">
        <div class="center" style="margin-bottom:1rem"><span class="ball" style="display:inline-block;width:44px">${U.ballSVG()}</span></div>
        <h1 class="center">Welcome back</h1>
        <p class="center muted" style="margin-top:-.4rem">Sign in to comment and join the community.</p>
        <form id="siform">
          <div class="field"><label>Email</label><input class="input" type="email" id="si-email" required></div>
          <div class="field"><label>Password</label><input class="input" type="password" id="si-pass" required></div>
          <div style="text-align:right;margin:-.5rem 0 .8rem"><a href="/forgot" style="color:var(--primary);font-weight:600;font-size:.88rem">Forgot password?</a></div>
          <button class="btn block" type="submit">Sign In</button>
        </form>
        <div class="divider">or</div>
        <p class="center" style="margin:0">New here? <a href="/signup" style="color:var(--primary);font-weight:700">Create an account</a></p>
      </div></section>`;
    document.getElementById("siform").onsubmit = async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector("button[type=submit]"); btn.disabled = true;
      const res = await S.signIn(document.getElementById("si-email").value, document.getElementById("si-pass").value);
      btn.disabled = false;
      if (res.error) { U.toast(res.error, "err"); return; }
      U.toast("Signed in — welcome, " + res.user.name.split(" ")[0], "ok");
      U.renderHeader(); U.setActiveNav(currentRoute()); U.go("/account");
    };
  }

  function signup(app) {
    if (S.currentUser()) { U.go("/account"); return; }
    U.setMeta("Create Account");
    app.innerHTML = `
      <section class="wrap auth-wrap"><div class="auth-card">
        <div class="center" style="margin-bottom:1rem"><span class="ball" style="display:inline-block;width:44px">${U.ballSVG()}</span></div>
        <h1 class="center">Join Time Grid FC</h1>
        <p class="center muted" style="margin-top:-.4rem">Create a free account to post comments.</p>
        <form id="suform">
          <div class="field"><label>Full name</label><input class="input" id="su-name" required></div>
          <div class="field"><label>Email</label><input class="input" type="email" id="su-email" required></div>
          <div class="field"><label>Password</label><input class="input" type="password" id="su-pass" required minlength="6"><span class="help">At least 6 characters.</span></div>
          <button class="btn block" type="submit">Create account</button>
        </form>
        <div class="divider">or</div>
        <p class="center" style="margin:0">Already have an account? <a href="/signin" style="color:var(--primary);font-weight:700">Sign in</a></p>
      </div></section>`;
    document.getElementById("suform").onsubmit = async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector("button[type=submit]"); btn.disabled = true;
      const res = await S.signUp({ name: document.getElementById("su-name").value, email: document.getElementById("su-email").value, password: document.getElementById("su-pass").value });
      btn.disabled = false;
      if (res.error) { U.toast(res.error, "err"); return; }
      U.toast("Account created — welcome!", "ok");
      U.renderHeader(); U.setActiveNav(currentRoute()); U.go("/account");
    };
  }

  function forgot(app) {
    if (S.currentUser()) { U.go("/account"); return; }
    U.setMeta("Reset Password", "Reset your Time Grid FC password with a one-time code sent to your email.");
    let step = 1, email = "", otp = "";
    const draw = () => {
      app.innerHTML = `
        <section class="wrap auth-wrap"><div class="auth-card">
          <div class="center" style="margin-bottom:1rem"><span class="ball" style="display:inline-block;width:44px">${U.ballSVG()}</span></div>
          <h1 class="center">Reset password</h1>
          <p class="center muted" style="margin-top:-.4rem" id="fp-sub"></p>
          <div class="steps" style="display:flex;gap:.4rem;justify-content:center;margin:.2rem 0 1rem">
            ${[1, 2, 3].map((s) => `<span style="width:26px;height:5px;border-radius:3px;background:${s <= step ? "var(--primary)" : "var(--border)"}"></span>`).join("")}
          </div>
          <div id="fp-body"></div>
          <div class="divider">or</div>
          <p class="center" style="margin:0"><a href="/signin" style="color:var(--primary);font-weight:700">Back to sign in</a></p>
        </div></section>`;
      document.getElementById("fp-sub").textContent =
        step === 1 ? "Enter your account email to get a 6-digit code." :
        step === 2 ? "Enter the 6-digit code sent to your email." :
        "Choose a new password.";
      const body = document.getElementById("fp-body");

      if (step === 1) {
        body.innerHTML = `<form id="fp1">
          <div class="field"><label>Email</label><input class="input" type="email" id="fp-email" value="${esc(email)}" required></div>
          <button class="btn block" type="submit">Send code</button></form>`;
        document.getElementById("fp1").onsubmit = async (e) => {
          e.preventDefault();
          const btn = e.target.querySelector("button"); btn.disabled = true;
          email = document.getElementById("fp-email").value.trim();
          const res = await S.forgotPassword(email); btn.disabled = false;
          if (res.error) { U.toast(res.error, "err"); return; }
          U.toast("If that email exists, a code has been sent.", "ok");
          if (res.devOtp) { otp = res.devOtp; U.toast("Dev code: " + res.devOtp, "ok"); }
          step = 2; draw();
        };
      } else if (step === 2) {
        body.innerHTML = `<form id="fp2">
          <div class="field"><label>6-digit code</label><input class="input" id="fp-otp" inputmode="numeric" maxlength="6" value="${esc(otp)}" placeholder="••••••" autocomplete="one-time-code" required></div>
          <button class="btn block" type="submit">Verify code</button></form>
          <p class="center" style="margin:.8rem 0 0;font-size:.86rem"><a id="fp-resend" style="color:var(--primary);cursor:pointer">Resend code</a> · <a id="fp-back" style="color:var(--primary);cursor:pointer">Change email</a></p>`;
        document.getElementById("fp2").onsubmit = async (e) => {
          e.preventDefault();
          const btn = e.target.querySelector("button"); btn.disabled = true;
          otp = document.getElementById("fp-otp").value.trim();
          const res = await S.verifyResetOtp(email, otp); btn.disabled = false;
          if (res.error) { U.toast(res.error, "err"); return; }
          step = 3; draw();
        };
        document.getElementById("fp-resend").onclick = async () => {
          const res = await S.forgotPassword(email);
          if (res.error) return U.toast(res.error, "err");
          U.toast("New code sent.", "ok");
          if (res.devOtp) { otp = res.devOtp; U.toast("Dev code: " + res.devOtp, "ok"); }
        };
        document.getElementById("fp-back").onclick = () => { step = 1; draw(); };
      } else {
        body.innerHTML = `<form id="fp3">
          <div class="field"><label>New password</label><input class="input" type="password" id="fp-pass" minlength="6" required><span class="help">At least 6 characters.</span></div>
          <div class="field"><label>Confirm password</label><input class="input" type="password" id="fp-pass2" minlength="6" required></div>
          <button class="btn block" type="submit">Update password</button></form>`;
        document.getElementById("fp3").onsubmit = async (e) => {
          e.preventDefault();
          const p1 = document.getElementById("fp-pass").value, p2 = document.getElementById("fp-pass2").value;
          if (p1.length < 6) return U.toast("Password must be at least 6 characters", "err");
          if (p1 !== p2) return U.toast("Passwords do not match", "err");
          const btn = e.target.querySelector("button"); btn.disabled = true;
          const res = await S.resetPassword(email, otp, p1); btn.disabled = false;
          if (res.error) { U.toast(res.error, "err"); if (/code/i.test(res.error)) { step = 2; draw(); } return; }
          U.toast("Password updated — you're signed in", "ok");
          U.renderHeader(); U.setActiveNav(""); U.go("/account");
        };
      }
    };
    draw();
  }

  function account(app) {
    const u = S.currentUser();
    if (!u) { U.go("/signin"); return; }
    U.setMeta("My Account");
    const myComments = S.all("comments").filter((c) => c.userId === u.id);
    app.innerHTML = `
      <section class="wrap section">
        ${crumbs([["Home", "/"], ["Account"]])}
        <div class="profile-head reveal">
          <div class="photo">${initials(u.name)}</div>
          <div><span class="chip">${esc(u.role)}</span><h1>${esc(u.name)}</h1>
            <div class="profile-meta"><div><div class="k">Email</div><div class="v">${esc(u.email)}</div></div>
            <div><div class="k">Member since</div><div class="v">${U.fmtDate(u.createdAt)}</div></div>
            <div><div class="k">Comments</div><div class="v">${myComments.length}</div></div></div>
          </div>
        </div>
        <div style="margin-top:1.4rem;display:flex;gap:.6rem;flex-wrap:wrap">
          ${(u.role === "Admin" || u.role === "Editor") ? `<a class="btn gold" href="admin.html">Open Admin Panel ${icon("arrow")}</a>` : ""}
          <button class="btn ghost" id="signout-btn">Sign out</button>
        </div>
        <div class="section" style="padding-bottom:0"><div class="section-head"><h2 style="font-size:1.2rem">Your recent comments</h2></div>
          ${myComments.length ? myComments.slice(0,10).map((c) => { const n = S.news1(c.postId); return `<div class="comment"><div class="av">${initials(u.name)}</div><div><div class="who">${n ? `<a href="${S.newsHref(n)}">${esc(n.title)}</a>` : "Post"} <span class="when">· ${U.timeAgo(c.createdAt)} · ${esc(c.status)}</span></div><p style="margin:.2rem 0 0">${esc(c.text)}</p></div></div>`; }).join("") : `<p class="muted">You haven't posted any comments yet.</p>`}
        </div>
      </section>`;
    document.getElementById("signout-btn").onclick = () => {
      S.signOut(); U.toast("Signed out", "ok"); U.renderHeader(); U.setActiveNav(""); U.go("/");
    };
    U.observeReveals(app);
  }

  function currentRoute() {
    const raw = location.protocol !== "file:" ? location.pathname.replace(/^\/+/, "") : location.hash.replace(/^#\/?/, "");
    return raw.split("/")[0] || "";
  }

  function notFound(app) {
    U.setMeta("Not Found");
    app.innerHTML = `<section class="wrap section">${empty("Page not found. Head back to the pitch.")}<div class="center"><a class="btn" href="/">Go home</a></div></section>`;
  }

  return {
    home, news, newsPost, players, playersCountry, player, teams, team,
    schedule, leagues, league, worldcup, awards, award, transfers, videos,
    about, contact, privacy, terms, signin, signup, forgot, account, notFound,
  };
})();
