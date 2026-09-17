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
  function thumb(cat, url, emoji, alt) {
    const c = CAT[cat] || { e: emoji || "⚽", g: "135deg,#0b6b3a,#16a34a" };
    if (url) return `<img src="${esc(url)}" alt="${esc(alt || "")}" loading="lazy" onerror="this.parentNode.innerHTML='<div class=&quot;ggrad&quot; style=&quot;height:100%;display:grid;place-items:center;background:linear-gradient(${c.g});font-size:2.4rem&quot;>${c.e}</div>'">`;
    return `<div class="ggrad" style="height:100%;display:grid;place-items:center;background:linear-gradient(${c.g});font-size:2.6rem">${c.e}</div>`;
  }
  function crumbs(items) {
    return `<div class="crumbs">` + items.map((it, i) =>
      i < items.length - 1 ? `<a href="${it[1]}">${esc(it[0])}</a><span>›</span>` : `<span style="color:var(--text-soft)">${esc(it[0])}</span>`
    ).join("") + `</div>`;
  }
  function empty(msg) { return `<div class="empty"><div class="ball">⚽</div><p>${esc(msg)}</p></div>`; }

  /* ---- card renderers ---- */
  function newsCard(n) {
    return `<a class="card reveal" href="#/news/${n.id}">
      <div class="thumb">${thumb(n.category, n.cover)}<span class="tag chip">${esc(n.category)}</span></div>
      <div class="pad">
        <h3>${esc(n.title)}</h3>
        <p class="muted" style="font-size:.9rem;margin:0">${esc(n.excerpt || "")}</p>
        <div class="meta">${esc(n.author)} · ${U.timeAgo(n.publishedAt)}</div>
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
    return `<a class="card person reveal" href="#/player/${p.id}">
      <div class="ph">${initials(p.name)}${p.photo ? `<img src="${esc(p.photo)}" alt="${esc(p.name)}" loading="lazy" onerror="this.remove()">` : ""}</div>
      <h3>${esc(p.name)}</h3>
      <div class="sub">${c ? U.flag(c.code) + " " : ""}${esc(p.pos)}${t ? " · " + esc(t.name) : ""}</div>
      <div style="margin-top:.5rem"><span class="chip">#${p.jersey}</span></div></a>`;
  }
  function teamCard(t) {
    const c = S.country(t.country);
    return `<a class="card person reveal" href="#/team/${t.id}">
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
      <div class="team"><span class="crest">${h ? (h.crest || initials(h.name)) : "?"}</span>${h ? `<a href="#/team/${h.id}">${esc(h.name)}</a>` : "TBD"}</div>
      <div class="mid">${mid}<div class="comp">${lg ? esc(lg.name) : ""}</div></div>
      <div class="team away"><span class="crest">${a ? (a.crest || initials(a.name)) : "?"}</span>${a ? `<a href="#/team/${a.id}">${esc(a.name)}</a>` : "TBD"}</div>
    </div>`;
  }
  function transferRow(tr) {
    const p = tr.player ? S.player(tr.player) : null;
    return `<div class="fixture reveal" style="grid-template-columns:1fr auto 1fr">
      <div class="team">${p ? `<a href="#/player/${p.id}"><b>${esc(tr.playerName)}</b></a>` : `<b>${esc(tr.playerName)}</b>`}</div>
      <div class="mid"><div class="ko">${icon("arrow")}</div><div class="comp">${esc(tr.type)}${tr.fee ? " · " + esc(tr.fee) : ""}</div><div class="comp">${U.fmtDate(tr.date)}</div></div>
      <div class="team away"><span>${esc(tr.from)} → <b>${esc(tr.to)}</b></span></div>
    </div>`;
  }

  /* =======================================================================
     HOME (FR-1)
     ======================================================================= */
  function home(app) {
    U.setMeta("", "Football news, stats & community — the official companion to the Time Grid FC YouTube channel.");
    const feat = S.publishedNews()[0];
    // Latest News shows the most recent posts (including the newest), so a freshly
    // published blog appears here immediately.
    const latest = S.publishedNews().slice(0, 6);
    const today = S.fixturesToday();
    const transfers = S.all("transfers").slice(0, 5);
    const vids = S.all("videos").slice(0, 3);

    app.innerHTML = `
      <section class="hero wrap">
        <div class="hero-grid">
          <div>
            <span class="eyebrow">Time Grid FC · Football Hub</span>
            <h1>Where football <span class="hl">lives</span>.<br>News, stats & every story.</h1>
            <p class="lead">Daily analysis, a searchable database of players and clubs, match schedules, league & World Cup history, awards, transfers — and every video from the Time Grid FC channel.</p>
            <div class="hero-cta">
              <a class="btn" href="#/news">Read the latest ${icon("arrow")}</a>
              <a class="btn ghost" href="#/schedule">Today's matches</a>
            </div>
            <div class="hero-stats">
              <div><div class="n">${S.all("players").length}+</div><div class="l">Players tracked</div></div>
              <div><div class="n">${S.all("teams").length}</div><div class="l">Clubs</div></div>
              <div><div class="n">${S.all("worldcups").filter(w=>w.type==="men").length}</div><div class="l">World Cups</div></div>
              <div><div class="n">${S.all("leagues").length}</div><div class="l">Competitions</div></div>
            </div>
          </div>
          <div>
            ${feat ? `<a class="hero-card reveal" href="#/news/${feat.id}">
              <div class="cover">${thumb(feat.category, feat.cover)}<span class="hero-badge">Featured</span></div>
              <div class="body"><span class="chip">${esc(feat.category)}</span>
                <h3 style="margin:.5rem 0 .3rem;font-size:1.3rem">${esc(feat.title)}</h3>
                <p class="muted" style="margin:0;font-size:.92rem">${esc(feat.excerpt||"")}</p></div>
            </a>` : ""}
            <div class="hero-blur"></div>
          </div>
        </div>
      </section>

      <section class="wrap section" style="padding-top:0">
        <div class="section-head"><div><span class="eyebrow">FR-6 · Fixtures</span><h2>Today's Matches</h2></div><a class="btn ghost sm" href="#/schedule">Full schedule ${icon("arrow")}</a></div>
        <div class="grid cols-2" id="home-fixtures">${today.length ? today.map(fixtureRow).join("") : empty("No matches scheduled for today. Check the full schedule.")}</div>
      </section>

      <section class="wrap section" style="padding-top:0">
        <div class="section-head"><div><span class="eyebrow">FR-2 · News & Blog</span><h2>Latest News</h2></div><a class="btn ghost sm" href="#/news">All news ${icon("arrow")}</a></div>
        <div class="grid cols-3">${latest.map(newsCard).join("")}</div>
      </section>

      <section class="wrap section" style="padding-top:0">
        <div class="grid cols-2" style="align-items:start">
          <div>
            <div class="section-head"><div><span class="eyebrow">FR-10 · Transfers</span><h2>Latest Transfers</h2></div><a class="btn ghost sm" href="#/transfers">All ${icon("arrow")}</a></div>
            <div class="grid" style="gap:.6rem">${transfers.map(transferRow).join("")}</div>
          </div>
          <div>
            <div class="section-head"><div><span class="eyebrow">FR-3 · Videos</span><h2>From the Channel</h2></div><a class="btn ghost sm" href="#/videos">All videos ${icon("arrow")}</a></div>
            <div class="grid" style="gap:.9rem">${vids.map(videoCard).join("")}</div>
          </div>
        </div>
      </section>

      <section class="wrap section" style="padding-top:0">
        <div class="card reveal" style="padding:2rem;text-align:center;background:linear-gradient(135deg,var(--green-800),var(--green-600));color:#fff">
          <h2 style="color:#fff">Explore the football universe</h2>
          <p style="opacity:.92;max-width:52ch;margin-inline:auto">Dive into player profiles by country, club squads, league champions, and the complete history of the World Cup.</p>
          <div class="hero-cta" style="justify-content:center;margin-top:1rem">
            <a class="btn gold" href="#/players">Players by country</a>
            <a class="btn ghost" style="color:#fff;border-color:rgba(255,255,255,.5)" href="#/worldcup">World Cup history</a>
          </div>
        </div>
      </section>`;
    U.observeReveals(app);
  }

  /* =======================================================================
     NEWS listing (FR-2) — filters + pagination
     ======================================================================= */
  function news(app) {
    U.setMeta("News & Blog", "The latest football news, match analysis, and player breakdowns from Time Grid FC.");
    let cat = "All", page = 1; const SIZE = 9;
    const cats = ["All", ...S.newsCategories()];
    app.innerHTML = `
      <section class="wrap section">
        ${crumbs([["Home", "#/"], ["News"]])}
        <div class="section-head"><div><span class="eyebrow">FR-2 · News & Blog</span><h2>Football News</h2></div></div>
        <div class="filters" id="news-filters">${cats.map((c) => `<button class="pill${c === "All" ? " active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}</div>
        <div class="grid cols-3" id="news-grid"></div>
        <div class="pager" id="news-pager"></div>
      </section>`;
    function render() {
      let list = S.publishedNews();
      if (cat !== "All") list = list.filter((n) => n.category === cat);
      const pages = Math.max(1, Math.ceil(list.length / SIZE));
      if (page > pages) page = pages;
      const slice = list.slice((page - 1) * SIZE, page * SIZE);
      const grid = document.getElementById("news-grid");
      grid.innerHTML = slice.length ? slice.map(newsCard).join("") : empty("No posts in this category yet.");
      const pager = document.getElementById("news-pager");
      pager.innerHTML = pages > 1 ? (
        `<button ${page === 1 ? "disabled" : ""} data-p="${page - 1}">‹</button>` +
        Array.from({ length: pages }, (_, i) => `<button class="${i + 1 === page ? "active" : ""}" data-p="${i + 1}">${i + 1}</button>`).join("") +
        `<button ${page === pages ? "disabled" : ""} data-p="${page + 1}">›</button>`
      ) : "";
      pager.querySelectorAll("button").forEach((b) => b.onclick = () => { page = +b.dataset.p; render(); window.scrollTo({top:0,behavior:"smooth"}); });
      U.observeReveals(grid);
    }
    document.getElementById("news-filters").querySelectorAll(".pill").forEach((b) => b.onclick = () => {
      document.querySelectorAll("#news-filters .pill").forEach((x) => x.classList.remove("active"));
      b.classList.add("active"); cat = b.dataset.cat; page = 1; render();
    });
    render();
  }

  /* ---- NEWS post + comments (FR-2, FR-11) — SEO/AdSense-optimised article ---- */
  function readingTime(html) {
    const words = (html || "").replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }
  function newsPost(app, params) {
    const n = S.news1(params.id);
    if (!n || n.status !== "published") { app.innerHTML = `<section class="wrap section">${empty("Article not found.")}</section>`; return; }

    // Full SEO: title, meta description, Open Graph, Twitter, canonical, JSON-LD (schema.org).
    U.setArticleSEO(n);

    const mins = readingTime(n.body);
    const related = S.publishedNews().filter((x) => x.id !== n.id && x.category === n.category).slice(0, 3);
    const rel = related.length ? related : S.publishedNews().filter((x) => x.id !== n.id).slice(0, 3);
    const updated = n.updatedAt && n.updatedAt !== n.publishedAt;

    // Add ids to <h2> headings and build a table of contents (router-safe anchors).
    let bodyHtml = n.body || `<p>${esc(n.excerpt || "")}</p>`;
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
          fig.innerHTML = `<img src="${esc(im.src)}" alt="${esc(im.cap || n.title)}" loading="lazy">` +
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
        ${crumbs([["Home", "#/"], ["News", "#/news"], [n.category, "#/news"], [n.title]])}
        <span class="badge-cat">${esc(n.category)}</span>
        <h1>${esc(n.title)}</h1>
        <div class="byline">
          <span class="chip">${initials(n.author)}</span>
          <span>By <b>${esc(n.author)}</b></span> ·
          <span>Published ${U.fmtDate(n.publishedAt)}</span>
          ${updated ? ` · <span>Updated ${U.fmtDate(n.updatedAt)}</span>` : ""}
          · <span>${mins} min read</span>
        </div>
        <div class="tag-row">${(n.tags || []).map((t) => `<span class="chip">#${esc(t)}</span>`).join(" ")}</div>
        <figure class="cover">${thumb(n.category, n.cover, "", n.title)}<figcaption class="muted">${esc(n.title)}</figcaption></figure>
        ${n.excerpt ? `<p class="lede">${esc(n.excerpt)}</p>` : ""}
        ${toc}
        <div class="content">${bodyHtml}</div>
        <div class="author-box card">
          <div class="av">${initials(n.author)}</div>
          <div><div class="who">${esc(n.author)}</div><p class="muted" style="margin:.2rem 0 0">Football writing from the Time Grid FC editorial team — analysis, news and features. <a href="#/about">About us</a> · <a href="#/contact">Contact</a></p></div>
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
      : `<div class="card" style="padding:1.2rem;margin:1rem 0 1.4rem;text-align:center"><p style="margin:.2rem 0">💬 <b>Sign in to join the conversation.</b></p><a class="btn sm" href="#/signin">Sign In</a> <a class="btn sm ghost" href="#/signup">Create account</a></div>`;
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
        ${crumbs([["Home", "#/"], ["Players"]])}
        <div class="section-head"><div><span class="eyebrow">FR-4 · Players Database</span><h2>Choose a country</h2><p class="muted" style="margin:0">Select a nation to see every player from that country in our database.</p></div></div>
        <div class="grid auto">${countries.map((c) => `
          <a class="country-tile reveal" href="#/players/${c.code}">
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
        ${crumbs([["Home", "#/"], ["Players", "#/players"], [c.name]])}
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
        ${crumbs([["Home", "#/"], ["Players", "#/players"], [c ? c.name : "", c ? "#/players/" + c.code : "#/players"], [p.name]])}
        <div class="profile-head reveal">
          <div class="photo">${initials(p.name)}${p.photo ? `<img src="${esc(p.photo)}" alt="${esc(p.name)}" onerror="this.remove()">` : ""}</div>
          <div>
            <span class="chip">#${p.jersey} · ${esc(p.pos)}</span>
            <h1>${esc(p.name)}</h1>
            <div class="profile-meta">
              <div><div class="k">Nationality</div><div class="v">${c ? U.flag(c.code) + " " + esc(c.name) : "—"}</div></div>
              <div><div class="k">Age</div><div class="v">${age} yrs</div></div>
              <div><div class="k">Born</div><div class="v">${U.fmtDate(p.dob)}</div></div>
              <div><div class="k">Club</div><div class="v">${t ? `<a href="#/team/${t.id}">${esc(t.name)}</a>` : "—"}</div></div>
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
              ${honors.map((h) => `<tr><td>${h.icon} <a href="#/awards/${h.awardId}">${esc(h.award)}</a></td><td class="rank">${h.year}</td></tr>`).join("")}
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
        ${crumbs([["Home", "#/"], ["Teams"]])}
        <div class="section-head"><div><span class="eyebrow">FR-5 · Teams & Clubs</span><h2>Clubs & Teams</h2></div></div>
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
        ${crumbs([["Home", "#/"], ["Teams", "#/teams"], [t.name]])}
        <div class="profile-head reveal">
          <div class="photo" style="font-size:2.6rem">${initials(t.name)}${t.country ? U.flagFill(t.country) : (t.crest || "")}</div>
          <div>
            <span class="chip">${c ? U.flag(c.code) + " " + esc(c.name) : ""}${lg ? " · " + esc(lg.name) : ""}</span>
            <h1>${esc(t.name)}</h1>
            <div class="profile-meta">
              <div><div class="k">Founded</div><div class="v">${t.founded}</div></div>
              <div><div class="k">Stadium</div><div class="v">${esc(t.stadium)}</div></div>
              <div><div class="k">Squad size</div><div class="v">${roster.length}</div></div>
              ${lg ? `<div><div class="k">League</div><div class="v"><a href="#/leagues/${lg.id}">${esc(lg.name)}</a></div></div>` : ""}
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
        ${crumbs([["Home", "#/"], ["Schedule"]])}
        <div class="section-head"><div><span class="eyebrow">FR-6 · Fixtures</span><h2>Match Schedule</h2></div></div>
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
        ${crumbs([["Home", "#/"], ["Leagues"]])}
        <div class="section-head"><div><span class="eyebrow">FR-7 · Competitions</span><h2>Leagues & Competitions</h2></div></div>
        <div class="grid cols-3">${list.map((l) => {
          const champ = (l.champions || [])[0];
          return `<a class="card reveal" href="#/leagues/${l.id}"><div class="pad">
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
        ${crumbs([["Home", "#/"], ["Leagues", "#/leagues"], [l.name]])}
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
    U.setMeta("World Cup History", "Every FIFA World Cup — Men's and Women's — champions, hosts, and all-time winners.");
    let type = "men";
    app.innerHTML = `
      <section class="wrap section">
        ${crumbs([["Home", "#/"], ["World Cup"]])}
        <div class="section-head"><div><span class="eyebrow">FR-8 · World Cup</span><h2>FIFA World Cup History</h2></div></div>
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
        ${crumbs([["Home", "#/"], ["Awards"]])}
        <div class="section-head"><div><span class="eyebrow">FR-9 · Awards</span><h2>Individual Awards</h2></div></div>
        <div class="grid cols-3">${list.map((a) => {
          const w = (a.winners || [])[0];
          return `<a class="card reveal" href="#/awards/${a.id}"><div class="pad">
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
        ${crumbs([["Home", "#/"], ["Awards", "#/awards"], [a.name]])}
        <div class="profile-head reveal">
          <div class="photo" style="font-size:3rem;background:linear-gradient(135deg,var(--gold-500),#b45309)">${a.icon}</div>
          <div><span class="chip gold">Individual Award</span><h1>${esc(a.name)}</h1><p class="muted" style="margin:.3rem 0 0;max-width:52ch">${esc(a.desc)}</p></div>
        </div>
        <div class="section" style="padding-bottom:0"><div class="section-head"><h2 style="font-size:1.2rem">Winners history</h2></div>
          <div class="table-wrap"><table class="tg"><thead><tr><th>Year</th><th>Player</th><th>Club at the time</th></tr></thead><tbody>
            ${(a.winners||[]).map((w) => `<tr><td class="rank">${w.year}</td><td>${w.player ? `<a href="#/player/${w.player}"><b>${esc(w.playerName)}</b></a>` : `<b>${esc(w.playerName)}</b>`}</td><td>${esc(w.club)}</td></tr>`).join("")}
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
        ${crumbs([["Home", "#/"], ["Transfers"]])}
        <div class="section-head"><div><span class="eyebrow">FR-10 · Transfers</span><h2>Transfer Feed</h2></div></div>
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
    U.setMeta("Videos", "Every Time Grid FC video — match analysis, player breakdowns and news. Watch on YouTube.");
    let cat = "All";
    const cats = ["All", "Match Analysis", "Player Analysis", "News"];
    app.innerHTML = `
      <section class="wrap section">
        ${crumbs([["Home", "#/"], ["Videos"]])}
        <div class="section-head"><div><span class="eyebrow">FR-3 · Videos</span><h2>Time Grid FC on YouTube</h2><p class="muted" style="margin:0">Clicking any video opens it on the Time Grid FC channel.</p></div>
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
  function about(app) {
    U.setMeta("About Us", "About Time Grid FC — an independent football news, analysis and statistics hub, and the companion site to the Time Grid FC YouTube channel.");
    app.innerHTML = `
      <section class="wrap section article">
        ${crumbs([["Home", "#/"], ["About"]])}
        <span class="eyebrow">About Us</span>
        <h1>About Time Grid FC</h1>
        <div class="content">
          <p>Time Grid FC is an independent football content hub and the companion website to the <a href="https://www.youtube.com/@timegrid_fc" target="_blank" rel="noopener">Time Grid FC YouTube channel</a>, which produces match analysis, player breakdowns, and football news for a growing community of fans.</p>
          <p>Our goal is to be a genuinely useful football destination: original daily news and analysis, a searchable database of players and clubs organised by country, match schedules, the history of major leagues and the FIFA World Cup, individual awards, transfer news, and every video from our channel — all in one place.</p>
          <h2>Who runs this site</h2>
          <p>Time Grid FC is an independent project created and edited by the Time Grid FC team. All editorial articles on this site are written originally by our team. We are not affiliated with, endorsed by, or officially connected to any football club, league, or governing body; club and competition names are used descriptively for identification only.</p>
          <h2>Editorial standards</h2>
          <p>We aim for accuracy and clearly separate reporting from opinion and analysis. If you spot an error, please contact us and we will review and correct it promptly.</p>
          <h2>Media &amp; image credits</h2>
          <p>Player photographs are sourced from <a href="https://commons.wikimedia.org" target="_blank" rel="noopener">Wikimedia Commons</a> under their respective Creative Commons licences; editorial and cover imagery is provided by <a href="https://unsplash.com" target="_blank" rel="noopener">Unsplash</a> under the Unsplash licence; country flags are from <a href="https://flagcdn.com" target="_blank" rel="noopener">flagcdn</a>. Video thumbnails belong to their respective owners and are shown only to link viewers to the original videos on YouTube.</p>
          <h2>Contact</h2>
          <p>Have a story tip, a correction, or a question? Visit our <a href="#/contact">Contact page</a> or reach us any time at <a href="mailto:contact@timegridfc.com">contact@timegridfc.com</a>.</p>
        </div>
      </section>`;
  }

  /* ---- Contact (AdSense: clear contact method) ---- */
  function contact(app) {
    U.setMeta("Contact Us", "Get in touch with the Time Grid FC team — story tips, corrections, feedback and enquiries.");
    app.innerHTML = `
      <section class="wrap section article">
        ${crumbs([["Home", "#/"], ["Contact"]])}
        <span class="eyebrow">Contact Us</span>
        <h1>Get in touch</h1>
        <div class="content">
          <p>We'd love to hear from you — whether it's a story tip, a correction to something we've published, feedback on the site, or a general enquiry.</p>
          <p><b>Email:</b> <a href="mailto:contact@timegridfc.com">contact@timegridfc.com</a><br>
             <b>YouTube:</b> <a href="https://www.youtube.com/@timegrid_fc" target="_blank" rel="noopener">@timegrid_fc</a></p>
          <p>Or send us a message directly:</p>
        </div>
        <form class="card" style="padding:1.4rem;max-width:520px" id="contact-form">
          <div class="field"><label>Name</label><input class="input" required></div>
          <div class="field"><label>Email</label><input class="input" type="email" required></div>
          <div class="field"><label>Message</label><textarea class="textarea" required></textarea></div>
          <button class="btn" type="submit">Send message</button>
        </form>
      </section>`;
    document.getElementById("contact-form").onsubmit = (e) => { e.preventDefault(); e.target.reset(); U.toast("Thanks! Your message has been sent.", "ok"); };
  }

  /* ---- Privacy Policy (required for AdSense) ---- */
  function privacy(app) {
    U.setMeta("Privacy Policy", "How Time Grid FC collects, uses and protects your information, including cookies and third-party advertising.");
    const updated = U.fmtDate(new Date().toISOString());
    app.innerHTML = `
      <section class="wrap section article">
        ${crumbs([["Home", "#/"], ["Privacy Policy"]])}
        <span class="eyebrow">Legal</span>
        <h1>Privacy Policy</h1>
        <div class="content">
          <p class="muted">Last updated: ${updated}</p>
          <p>This Privacy Policy explains how Time Grid FC ("we", "us", "our") collects, uses, and safeguards information when you visit this website. By using the site, you agree to the practices described here.</p>

          <h2>Information we collect</h2>
          <p><b>Account information.</b> If you create an account, we store the name and email address you provide and an encrypted (hashed) version of your password.</p>
          <p><b>Content you submit.</b> Comments you post on articles are stored and displayed with your chosen name.</p>
          <p><b>Usage &amp; log data.</b> Like most websites, our servers automatically record standard information such as your browser type, device, approximate location derived from your IP address, referring pages, and the pages you view.</p>

          <h2>Cookies</h2>
          <p>We use cookies and similar browser storage to keep you signed in, remember preferences such as your light/dark theme choice, and understand how the site is used. You can control or delete cookies through your browser settings; some features may not work correctly if cookies are disabled.</p>

          <h2>Third-party advertising (Google AdSense)</h2>
          <p>We may use Google AdSense to display advertisements. Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this and other websites.</p>
          <ul>
            <li>Google's use of advertising cookies enables it and its partners to serve ads to you based on your visits to this site and/or other sites on the Internet.</li>
            <li>You may opt out of personalised advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener">Google Ads Settings</a>.</li>
            <li>You can also opt out of some third-party vendors' use of cookies for personalised advertising at <a href="https://www.aboutads.info" target="_blank" rel="noopener">aboutads.info</a>.</li>
          </ul>
          <p>Third parties may collect or receive information from this site and elsewhere and use that information to provide measurement services and target ads. Our advertising partners' use of your data is governed by their own privacy policies.</p>

          <h2>Analytics</h2>
          <p>We may use privacy-respecting analytics tools to measure traffic and improve content. These tools may set cookies and process aggregated usage data.</p>

          <h2>Third-party links &amp; media</h2>
          <p>This site links to external sites (such as YouTube) and displays media sourced from third parties (see our <a href="#/about">media credits</a>). We are not responsible for the content or privacy practices of external sites.</p>

          <h2>Children's privacy</h2>
          <p>This site is not directed to children under the age of 13, and we do not knowingly collect personal information from them.</p>

          <h2>Your rights</h2>
          <p>You may request access to, correction of, or deletion of the personal information associated with your account by contacting us. Depending on your location, additional rights may apply under laws such as the GDPR or CCPA.</p>

          <h2>Changes to this policy</h2>
          <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with a revised "last updated" date.</p>

          <h2>Contact</h2>
          <p>Questions about this policy? Email us at <a href="mailto:contact@timegridfc.com">contact@timegridfc.com</a> or use our <a href="#/contact">Contact page</a>.</p>
        </div>
      </section>`;
  }

  /* ---- Terms & Disclaimer ---- */
  function terms(app) {
    U.setMeta("Terms & Disclaimer", "The terms of use and content disclaimer for the Time Grid FC website.");
    const updated = U.fmtDate(new Date().toISOString());
    app.innerHTML = `
      <section class="wrap section article">
        ${crumbs([["Home", "#/"], ["Terms & Disclaimer"]])}
        <span class="eyebrow">Legal</span>
        <h1>Terms of Use &amp; Disclaimer</h1>
        <div class="content">
          <p class="muted">Last updated: ${updated}</p>
          <p>By accessing and using Time Grid FC, you accept these terms. If you do not agree, please do not use the site.</p>

          <h2>Content &amp; accuracy</h2>
          <p>All articles are provided for general information, analysis, and entertainment. While we strive for accuracy, football data and news change quickly and we make no warranty that all content is complete, current, or error-free. Nothing on this site constitutes professional or betting advice.</p>

          <h2>Intellectual property</h2>
          <p>Original editorial content on this site is owned by Time Grid FC. Club names, competition names, and any trademarks referenced remain the property of their respective owners and are used for identification and descriptive purposes only. Third-party images are used under the licences described in our <a href="#/about">media credits</a>.</p>

          <h2>User-contributed content</h2>
          <p>You are responsible for comments you post. Do not post unlawful, abusive, misleading, or infringing content. We may moderate, edit, or remove comments at our discretion.</p>

          <h2>External links</h2>
          <p>This site contains links to third-party websites, including YouTube. We are not responsible for the content, policies, or availability of those sites.</p>

          <h2>Limitation of liability</h2>
          <p>The site is provided "as is" without warranties of any kind. To the fullest extent permitted by law, Time Grid FC is not liable for any loss or damage arising from your use of the site.</p>

          <h2>Changes</h2>
          <p>We may update these terms at any time; continued use of the site constitutes acceptance of the revised terms.</p>

          <h2>Contact</h2>
          <p>Questions? Email <a href="mailto:contact@timegridfc.com">contact@timegridfc.com</a>.</p>
        </div>
      </section>`;
  }

  /* =======================================================================
     AUTH: sign in / sign up / account (FR-11)
     ======================================================================= */
  function signin(app) {
    if (S.currentUser()) { U.go("#/account"); return; }
    U.setMeta("Sign In");
    app.innerHTML = `
      <section class="wrap auth-wrap"><div class="auth-card">
        <div class="center" style="margin-bottom:1rem"><span class="ball" style="display:inline-block;width:44px">${U.ballSVG()}</span></div>
        <h1 class="center">Welcome back</h1>
        <p class="center muted" style="margin-top:-.4rem">Sign in to comment and join the community.</p>
        <form id="siform">
          <div class="field"><label>Email</label><input class="input" type="email" id="si-email" required></div>
          <div class="field"><label>Password</label><input class="input" type="password" id="si-pass" required></div>
          <button class="btn block" type="submit">Sign In</button>
        </form>
        <div class="divider">or</div>
        <p class="center" style="margin:0">New here? <a href="#/signup" style="color:var(--primary);font-weight:700">Create an account</a></p>
      </div></section>`;
    document.getElementById("siform").onsubmit = async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector("button[type=submit]"); btn.disabled = true;
      const res = await S.signIn(document.getElementById("si-email").value, document.getElementById("si-pass").value);
      btn.disabled = false;
      if (res.error) { U.toast(res.error, "err"); return; }
      U.toast("Signed in — welcome, " + res.user.name.split(" ")[0], "ok");
      U.renderHeader(); U.setActiveNav(currentRoute()); U.go("#/account");
    };
  }

  function signup(app) {
    if (S.currentUser()) { U.go("#/account"); return; }
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
        <p class="center" style="margin:0">Already have an account? <a href="#/signin" style="color:var(--primary);font-weight:700">Sign in</a></p>
      </div></section>`;
    document.getElementById("suform").onsubmit = async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector("button[type=submit]"); btn.disabled = true;
      const res = await S.signUp({ name: document.getElementById("su-name").value, email: document.getElementById("su-email").value, password: document.getElementById("su-pass").value });
      btn.disabled = false;
      if (res.error) { U.toast(res.error, "err"); return; }
      U.toast("Account created — welcome!", "ok");
      U.renderHeader(); U.setActiveNav(currentRoute()); U.go("#/account");
    };
  }

  function account(app) {
    const u = S.currentUser();
    if (!u) { U.go("#/signin"); return; }
    U.setMeta("My Account");
    const myComments = S.all("comments").filter((c) => c.userId === u.id);
    app.innerHTML = `
      <section class="wrap section">
        ${crumbs([["Home", "#/"], ["Account"]])}
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
          ${myComments.length ? myComments.slice(0,10).map((c) => { const n = S.news1(c.postId); return `<div class="comment"><div class="av">${initials(u.name)}</div><div><div class="who">${n ? `<a href="#/news/${n.id}">${esc(n.title)}</a>` : "Post"} <span class="when">· ${U.timeAgo(c.createdAt)} · ${esc(c.status)}</span></div><p style="margin:.2rem 0 0">${esc(c.text)}</p></div></div>`; }).join("") : `<p class="muted">You haven't posted any comments yet.</p>`}
        </div>
      </section>`;
    document.getElementById("signout-btn").onclick = () => {
      S.signOut(); U.toast("Signed out", "ok"); U.renderHeader(); U.setActiveNav(""); U.go("#/");
    };
    U.observeReveals(app);
  }

  function currentRoute() { return (location.hash.replace(/^#\/?/, "").split("/")[0]) || ""; }

  function notFound(app) {
    U.setMeta("Not Found");
    app.innerHTML = `<section class="wrap section">${empty("Page not found. Head back to the pitch.")}<div class="center"><a class="btn" href="#/">Go home</a></div></section>`;
  }

  return {
    home, news, newsPost, players, playersCountry, player, teams, team,
    schedule, leagues, league, worldcup, awards, award, transfers, videos,
    about, contact, privacy, terms, signin, signup, account, notFound,
  };
})();
