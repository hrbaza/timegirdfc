/* =========================================================================
   Time Grid FC — Admin Panel / CMS (FR-14)
   Separate admin session. Dashboard + full CRUD for every content module,
   comment moderation, and user management. Schema-driven CRUD engine.
   ========================================================================= */
window.TG = window.TG || {};
TG.admin = (function () {
  const S = TG.store, U = TG.ui;
  const esc = U.esc, icon = U.icon, initials = U.initials;

  // The admin panel runs either embedded in the SPA (#/admin/...) or on its own
  // page admin.html (data-app="admin", routes are #/<section>).
  const STANDALONE = typeof document !== "undefined" && document.body && document.body.getAttribute("data-app") === "admin";
  const secHref = (k) => (STANDALONE ? "#/" + k : "#/admin/" + k);
  const siteHref = STANDALONE ? "index.html" : "#/";

  const POS = ["Goalkeeper", "Defender", "Midfielder", "Forward"];
  const opt = {
    teams: () => S.all("teams").map((t) => ({ v: t.id, l: t.name })),
    leagues: () => S.all("leagues").map((l) => ({ v: l.id, l: l.name })),
    countries: () => S.all("countries").map((c) => ({ v: c.code, l: c.flag + " " + c.name })),
    players: () => [{ v: "", l: "— none —" }].concat(S.all("players").map((p) => ({ v: p.id, l: p.name }))),
  };

  /* ---- module schemas ---- */
  const SCHEMAS = {
    news: {
      title: "News & Blog", col: "news", icon: "📰",
      columns: [
        { h: "Title", get: (r) => esc(r.title) },
        { h: "Category", get: (r) => `<span class="chip">${esc(r.category)}</span>` },
        { h: "Status", get: (r) => `<span class="chip ${r.status === "published" ? "gold" : ""}">${esc(r.status)}</span>` },
        { h: "Published", get: (r) => U.fmtDate(r.publishedAt) },
      ],
      fields: [
        { n: "title", l: "Title", t: "text", req: true },
        { n: "category", l: "Category", t: "select", opts: () => S.newsCategories().map((c) => ({ v: c, l: c })) },
        { n: "excerpt", l: "Excerpt / summary", t: "textarea", help: "Short summary shown on cards and used as a fallback SEO description." },
        { n: "body", l: "Body (HTML allowed)", t: "textarea", big: true, help: "Use <p>, <h2>, <h3>, <ul>, <blockquote>. Aim for 600+ words with clear headings for SEO." },
        { n: "metaDescription", l: "SEO meta description", t: "textarea", help: "~150–160 characters. Shown in Google results. Falls back to the excerpt if empty." },
        { n: "keywords", l: "SEO keywords", t: "csv", help: "Comma-separated focus keywords." },
        { n: "cover", l: "Cover image", t: "image" },
        { n: "author", l: "Author", t: "text" },
        { n: "tags", l: "Tags", t: "csv", help: "Comma-separated." },
        { n: "status", l: "Status", t: "select", opts: () => [{ v: "published", l: "Published" }, { v: "draft", l: "Draft" }] },
        { n: "publishedAt", l: "Publish date/time", t: "datetime", help: "Schedule future posts for a daily routine." },
      ],
      def: () => ({ title: "", category: "General Football News", excerpt: "", body: "<p></p>", metaDescription: "", keywords: [], cover: "", author: "Time Grid FC", tags: [], status: "published", publishedAt: new Date().toISOString() }),
    },
    players: {
      title: "Players", col: "players", icon: "🧍",
      columns: [
        { h: "Name", get: (r) => esc(r.name) },
        { h: "Country", get: (r) => { const c = S.country(r.country); return c ? c.flag + " " + esc(c.name) : "—"; } },
        { h: "Position", get: (r) => esc(r.pos) },
        { h: "Club", get: (r) => { const t = S.team(r.club); return t ? esc(t.name) : "—"; } },
      ],
      fields: [
        { n: "name", l: "Full name", t: "text", req: true },
        { n: "country", l: "Nationality", t: "select", opts: opt.countries },
        { n: "pos", l: "Position", t: "select", opts: () => POS.map((p) => ({ v: p, l: p })) },
        { n: "jersey", l: "Jersey number", t: "number" },
        { n: "club", l: "Current club", t: "select", opts: opt.teams },
        { n: "dob", l: "Date of birth", t: "date" },
        { n: "photo", l: "Photo", t: "image" },
        { n: "career", l: "Career history", t: "json", help: 'Array e.g. [{"club":"FC Barcelona","years":"2004–2021"}]' },
        { n: "stats", l: "Season statistics", t: "json", help: 'Array e.g. [{"season":"2023–24","club":"...","apps":40,"goals":30,"assists":10}]' },
      ],
      def: () => ({ name: "", country: "AR", pos: "Forward", jersey: 10, club: "", dob: "2000-01-01", photo: "", career: [], stats: [] }),
    },
    teams: {
      title: "Teams & Clubs", col: "teams", icon: "🛡️",
      columns: [
        { h: "Name", get: (r) => `${r.crest || ""} ${esc(r.name)}` },
        { h: "Country", get: (r) => { const c = S.country(r.country); return c ? c.flag + " " + esc(c.name) : "—"; } },
        { h: "League", get: (r) => { const l = S.league(r.league); return l ? esc(l.name) : "—"; } },
        { h: "Founded", get: (r) => r.founded },
      ],
      fields: [
        { n: "name", l: "Club name", t: "text", req: true },
        { n: "crest", l: "Crest (emoji or leave blank)", t: "text" },
        { n: "founded", l: "Founded (year)", t: "number" },
        { n: "stadium", l: "Home stadium", t: "text" },
        { n: "country", l: "Country", t: "select", opts: opt.countries },
        { n: "league", l: "League", t: "select", opts: opt.leagues },
        { n: "honors", l: "Major honours", t: "csv", help: "Comma-separated, e.g. Premier League ×10, FA Cup ×7" },
      ],
      def: () => ({ name: "", crest: "", founded: 1900, stadium: "", country: "EN", league: "", honors: [] }),
    },
    leagues: {
      title: "Leagues / Competitions", col: "leagues", icon: "🏅",
      columns: [
        { h: "Name", get: (r) => `${r.flag || ""} ${esc(r.name)}` },
        { h: "Type", get: (r) => esc(r.type) },
        { h: "Country/Region", get: (r) => esc(r.country) },
        { h: "Champion", get: (r) => { const c = (r.champions || [])[0]; return c ? esc(c.team) + " (" + esc(c.season) + ")" : "—"; } },
      ],
      fields: [
        { n: "name", l: "Name", t: "text", req: true },
        { n: "country", l: "Country / Region", t: "text" },
        { n: "flag", l: "Flag emoji", t: "text" },
        { n: "type", l: "Type", t: "select", opts: () => ["Domestic League", "Domestic Cup", "Continental Cup", "International"].map((x) => ({ v: x, l: x })) },
        { n: "champions", l: "Champions history", t: "json", help: 'Array e.g. [{"season":"2023–24","team":"Manchester City"}] — newest first.' },
      ],
      def: () => ({ name: "", country: "", flag: "🏆", type: "Domestic League", champions: [] }),
    },
    worldcups: {
      title: "World Cup", col: "worldcups", icon: "🌍",
      columns: [
        { h: "Type", get: (r) => `<span class="chip">${r.type === "men" ? "Men's" : "Women's"}</span>` },
        { h: "Year", get: (r) => r.year },
        { h: "Host", get: (r) => esc(r.host) },
        { h: "Champion", get: (r) => `🏆 ${esc(r.champion)}` },
      ],
      fields: [
        { n: "type", l: "Tournament", t: "select", opts: () => [{ v: "men", l: "Men's World Cup" }, { v: "women", l: "Women's World Cup" }] },
        { n: "year", l: "Year", t: "number", req: true },
        { n: "host", l: "Host country", t: "text" },
        { n: "champion", l: "Champion", t: "text" },
        { n: "runnerUp", l: "Runner-up", t: "text" },
      ],
      def: () => ({ type: "men", year: 2026, host: "", champion: "", runnerUp: "" }),
    },
    awards: {
      title: "Awards", col: "awards", icon: "🏆",
      columns: [
        { h: "Award", get: (r) => `${r.icon || ""} ${esc(r.name)}` },
        { h: "Winners", get: (r) => (r.winners || []).length },
        { h: "Latest", get: (r) => { const w = (r.winners || [])[0]; return w ? esc(w.playerName) + " (" + w.year + ")" : "—"; } },
      ],
      fields: [
        { n: "name", l: "Award name", t: "text", req: true },
        { n: "icon", l: "Icon (emoji)", t: "text" },
        { n: "desc", l: "Description", t: "textarea" },
        { n: "winners", l: "Winners history", t: "json", help: 'Array e.g. [{"year":2024,"player":"p-rodri","playerName":"Rodri","club":"Manchester City"}] — player id optional, links to profile.' },
      ],
      def: () => ({ name: "", icon: "🏆", desc: "", winners: [] }),
    },
    transfers: {
      title: "Transfers", col: "transfers", icon: "🔄",
      columns: [
        { h: "Player", get: (r) => esc(r.playerName) },
        { h: "From → To", get: (r) => `${esc(r.from)} → <b>${esc(r.to)}</b>` },
        { h: "Type", get: (r) => esc(r.type) },
        { h: "Date", get: (r) => U.fmtDate(r.date) },
      ],
      fields: [
        { n: "playerName", l: "Player name", t: "text", req: true },
        { n: "player", l: "Link to player profile", t: "select", opts: opt.players },
        { n: "from", l: "From club", t: "text" },
        { n: "to", l: "To club", t: "text" },
        { n: "type", l: "Transfer type", t: "select", opts: () => [{ v: "Permanent", l: "Permanent" }, { v: "Loan", l: "Loan" }] },
        { n: "fee", l: "Fee (optional)", t: "text" },
        { n: "date", l: "Date", t: "date" },
      ],
      def: () => ({ playerName: "", player: "", from: "", to: "", type: "Permanent", fee: "", date: new Date().toISOString().slice(0, 10) }),
    },
    fixtures: {
      title: "Fixtures", col: "fixtures", icon: "📅",
      columns: [
        { h: "Match", get: (r) => { const h = S.team(r.home), a = S.team(r.away); return `${h ? esc(h.name) : "?"} vs ${a ? esc(a.name) : "?"}`; } },
        { h: "Date", get: (r) => U.fmtDate(r.date) + " " + esc(r.time || "") },
        { h: "Status", get: (r) => `<span class="chip ${r.status === "live" ? "live" : ""}">${esc(r.status)}</span>` },
        { h: "Score", get: (r) => (r.hs != null && r.as != null) ? `${r.hs}–${r.as}` : "—" },
      ],
      fields: [
        { n: "home", l: "Home team", t: "select", opts: opt.teams },
        { n: "away", l: "Away team", t: "select", opts: opt.teams },
        { n: "date", l: "Date", t: "date" },
        { n: "time", l: "Kick-off time", t: "time" },
        { n: "venue", l: "Venue", t: "text" },
        { n: "comp", l: "Competition", t: "select", opts: opt.leagues },
        { n: "status", l: "Status", t: "select", opts: () => [{ v: "upcoming", l: "Upcoming" }, { v: "live", l: "Live" }, { v: "finished", l: "Finished" }] },
        { n: "hs", l: "Home score", t: "number" },
        { n: "as", l: "Away score", t: "number" },
      ],
      def: () => ({ home: "", away: "", date: new Date().toISOString().slice(0, 10), time: "20:00", venue: "", comp: "", status: "upcoming", hs: null, as: null }),
    },
    users: {
      title: "Users", col: "users", icon: "👥", adminOnly: true,
      columns: [
        { h: "Name", get: (r) => esc(r.name) },
        { h: "Email", get: (r) => esc(r.email) },
        { h: "Role", get: (r) => `<span class="chip ${r.role !== "Visitor" ? "gold" : ""}">${esc(r.role)}</span>` },
        { h: "Joined", get: (r) => U.fmtDate(r.createdAt) },
      ],
      fields: [
        { n: "name", l: "Name", t: "text", req: true },
        { n: "email", l: "Email", t: "text", req: true },
        { n: "role", l: "Role", t: "select", opts: () => ["Visitor", "Editor", "Admin"].map((x) => ({ v: x, l: x })) },
      ],
      def: () => ({ name: "", email: "", role: "Visitor", createdAt: new Date().toISOString() }),
    },
  };

  const SIDEBAR = [
    ["Overview", [["dashboard", "Dashboard", "📊"]]],
    ["Content", [["news", "News & Blog", "📰"], ["videos", "Videos", "▶️"], ["transfers", "Transfers", "🔄"]]],
    ["Football data", [["players", "Players", "🧍"], ["teams", "Teams", "🛡️"], ["leagues", "Leagues", "🏅"], ["worldcups", "World Cup", "🌍"], ["awards", "Awards", "🏆"], ["fixtures", "Fixtures", "📅"]]],
    ["Community", [["comments", "Comments", "💬"], ["users", "Users", "👥"]]],
  ];

  // videos schema (added here to keep near sidebar)
  SCHEMAS.videos = {
    title: "Videos", col: "videos", icon: "▶️",
    columns: [
      { h: "Title", get: (r) => esc(r.title) },
      { h: "Category", get: (r) => `<span class="chip">${esc(r.category)}</span>` },
      { h: "URL", get: (r) => `<a href="${esc(r.url)}" target="_blank" rel="noopener">YouTube ↗</a>` },
    ],
    fields: [
      { n: "title", l: "Title", t: "text", req: true },
      { n: "url", l: "YouTube URL", t: "text", req: true, help: "The system would auto-fetch title & thumbnail via the YouTube Data API; manual fields below are the fallback." },
      { n: "category", l: "Category", t: "select", opts: () => ["Match Analysis", "Player Analysis", "News"].map((c) => ({ v: c, l: c })) },
      { n: "desc", l: "Short description", t: "textarea" },
      { n: "thumb", l: "Thumbnail image", t: "image" },
    ],
    def: () => ({ title: "", url: "https://www.youtube.com/@timegrid_fc", category: "Match Analysis", desc: "", thumb: "", addedAt: new Date().toISOString() }),
  };

  /* ---- entry ---- */
  function render(app, section) {
    const admin = S.currentAdmin();
    if (!admin) return renderLogin(app);
    section = section || "dashboard";
    const secTitle = section === "dashboard" ? "Dashboard" : section === "comments" ? "Comments" : (SCHEMAS[section] ? SCHEMAS[section].title : "Admin");
    U.setMeta("Admin · " + secTitle);
    app.innerHTML = `<div class="admin">
      <aside class="admin-side">${sidebar(section)}</aside>
      <div class="admin-main" id="admin-main"></div>
    </div>`;
    wireSidebar();
    const main = document.getElementById("admin-main");
    if (section === "dashboard") dashboard(main, admin);
    else if (section === "comments") commentsModule(main);
    else if (SCHEMAS[section]) {
      if (SCHEMAS[section].adminOnly && admin.role !== "Admin") { main.innerHTML = notAllowed(); return; }
      moduleTable(main, section);
    } else notFound(main);
  }

  function sidebar(active) {
    const admin = S.currentAdmin();
    return SIDEBAR.map(([grp, items]) => `<div class="grp">${grp}</div>` +
      items.filter(([k]) => !(SCHEMAS[k] && SCHEMAS[k].adminOnly && admin.role !== "Admin"))
        .map(([k, l, ic]) => `<a href="${secHref(k)}" class="${k === active ? "active" : ""}"><span>${ic}</span> ${l}</a>`).join(""))
      .join("") + `<div class="grp">Session</div><a href="${siteHref}"><span>🌐</span> View site</a><a id="admin-logout"><span>🚪</span> Sign out</a>`;
  }
  function wireSidebar() {
    const lo = document.getElementById("admin-logout");
    if (lo) lo.onclick = () => { S.adminSignOut(); U.toast("Admin signed out", "ok"); if (!STANDALONE) U.go("#/admin"); render(document.getElementById("tg-app"), "dashboard"); };
  }

  /* ---- login ---- */
  function renderLogin(app) {
    U.setMeta("Admin Login");
    app.innerHTML = `
      <section class="wrap auth-wrap"><div class="auth-card">
        <div class="center" style="margin-bottom:.6rem;font-size:2rem">🔐</div>
        <h1 class="center">Admin Panel</h1>
        <p class="center muted" style="margin-top:-.4rem">Secure content management for Time Grid FC.</p>
        <form id="alform">
          <div class="field"><label>Email</label><input class="input" type="email" id="al-email" required></div>
          <div class="field"><label>Password</label><input class="input" type="password" id="al-pass" required></div>
          <button class="btn block" type="submit">Sign in to Admin</button>
        </form>
      </div></section>`;
    document.getElementById("alform").onsubmit = async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector("button[type=submit]"); btn.disabled = true;
      const res = await S.adminSignIn(document.getElementById("al-email").value, document.getElementById("al-pass").value);
      btn.disabled = false;
      if (res.error) { U.toast(res.error, "err"); return; }
      U.toast("Welcome to the admin panel", "ok"); render(app, "dashboard");
    };
  }

  const notAllowed = () => `<div class="empty"><div class="ball">🔒</div><p>Your role doesn't have access to this module.</p></div>`;
  const notFound = (m) => m.innerHTML = `<div class="empty"><div class="ball">⚽</div><p>Module not found.</p></div>`;

  /* ---- dashboard ---- */
  function dashboard(main, admin) {
    const posts = S.publishedNews().length;
    const drafts = S.all("news").filter((n) => n.status === "draft").length;
    const pending = S.pendingComments().length;
    const upcoming = S.fixturesUpcoming().length;
    const kpi = (ic, n, l) => `<div class="card"><div class="ic">${ic}</div><div><div class="n">${n}</div><div class="l">${l}</div></div></div>`;
    main.innerHTML = `
      <div class="admin-top"><div><h1 style="margin:0">Dashboard</h1><p class="muted" style="margin:0">Welcome back, ${esc(admin.name)} · <span class="chip">${esc(admin.role)}</span></p></div>
        <a class="btn" href="${secHref('news')}" onclick="TG.admin.quickNew('news',event)">${icon("plus")} New post</a></div>
      <div class="kpi">
        ${kpi("📰", posts, "Published posts")}
        ${kpi("✍️", drafts, "Drafts")}
        ${kpi("💬", pending, "Pending comments")}
        ${kpi("📅", upcoming, "Upcoming fixtures")}
        ${kpi("🧍", S.all("players").length, "Players")}
        ${kpi("🛡️", S.all("teams").length, "Teams")}
      </div>
      <div class="grid cols-2" style="align-items:start">
        <div class="card" style="padding:1.2rem">
          <div class="section-head" style="margin-bottom:.8rem"><h2 style="font-size:1.1rem;margin:0">Recent posts</h2><a class="btn ghost sm" href="${secHref('news')}">Manage</a></div>
          ${S.all("news").slice(0, 5).map((n) => `<div style="display:flex;justify-content:space-between;gap:.6rem;padding:.5rem 0;border-bottom:1px solid var(--border)"><span>${esc(n.title)}</span><span class="chip ${n.status === "published" ? "gold" : ""}">${esc(n.status)}</span></div>`).join("")}
        </div>
        <div class="card" style="padding:1.2rem">
          <div class="section-head" style="margin-bottom:.8rem"><h2 style="font-size:1.1rem;margin:0">Pending comments</h2><a class="btn ghost sm" href="${secHref('comments')}">Moderate</a></div>
          ${pending ? S.pendingComments().slice(0, 5).map((c) => `<div style="padding:.5rem 0;border-bottom:1px solid var(--border)"><b>${esc(c.author)}</b> <span class="muted">on a post</span><br><span class="muted" style="font-size:.9rem">${esc(c.text)}</span></div>`).join("") : `<p class="muted">No pending comments 🎉</p>`}
        </div>
      </div>
      <div class="card" style="padding:1.2rem;margin-top:1.2rem">
        <div class="section-head" style="margin-bottom:.8rem"><h2 style="font-size:1.1rem;margin:0">Upcoming fixtures</h2><a class="btn ghost sm" href="${secHref('fixtures')}">Manage</a></div>
        <div class="table-wrap"><table class="tg"><thead><tr><th>Match</th><th>Date</th><th>Competition</th></tr></thead><tbody>
          ${S.fixturesUpcoming().slice(0, 6).map((f) => { const h = S.team(f.home), a = S.team(f.away), l = S.league(f.comp); return `<tr><td>${h ? esc(h.name) : "?"} vs ${a ? esc(a.name) : "?"}</td><td>${U.fmtDay(f.date)} ${esc(f.time)}</td><td>${l ? esc(l.name) : ""}</td></tr>`; }).join("")}
        </tbody></table></div>
      </div>
      <div style="margin-top:1.4rem;display:flex;gap:.6rem;flex-wrap:wrap">
        <span class="chip">${S.isApi() ? "🟢 Connected to MongoDB backend" : "🟠 Offline demo (localStorage)"}</span>
        ${S.isApi() ? "" : `<button class="btn ghost sm danger" id="reset-data">Reset all data to defaults</button>
        <span class="help" style="align-self:center">Restores the seeded demo content.</span>`}
      </div>`;
    const resetBtn = document.getElementById("reset-data");
    if (resetBtn) resetBtn.onclick = async () => {
      if (confirm("Reset ALL content to the original seeded data? This cannot be undone.")) {
        await S.resetAll(); U.toast("Data reset to defaults", "ok"); U.renderHeader(); U.setActiveNav(""); render(document.getElementById("tg-app"), "dashboard");
      }
    };
  }

  /* ---- generic module table ---- */
  function moduleTable(main, key) {
    const sc = SCHEMAS[key];
    let q = "";
    main.innerHTML = `
      <div class="admin-top"><div><h1 style="margin:0">${sc.icon} ${sc.title}</h1><p class="muted" style="margin:0">${S.all(sc.col).length} record(s)</p></div>
        <button class="btn" id="add-btn">${icon("plus")} Add ${sc.title.replace(/s$/, "").replace(/ & .*/, "")}</button></div>
      <div class="data-toolbar"><div class="search-box" style="max-width:340px"><span>${icon("search")}</span><input class="input" id="tbl-search" placeholder="Search ${sc.title.toLowerCase()}…"></div></div>
      <div class="table-wrap"><table class="tg"><thead><tr>${sc.columns.map((c) => `<th>${c.h}</th>`).join("")}<th style="text-align:right">Actions</th></tr></thead><tbody id="tbl-body"></tbody></table></div>`;
    function draw() {
      let rows = S.all(sc.col);
      if (q) { const ql = q.toLowerCase(); rows = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(ql)); }
      const body = document.getElementById("tbl-body");
      body.innerHTML = rows.length ? rows.map((r) => `<tr>${sc.columns.map((c) => `<td>${c.get(r)}</td>`).join("")}
        <td><div class="row-actions" style="justify-content:flex-end">
          <button class="icn-btn" data-edit="${r.id}" title="Edit">${icon("edit")}</button>
          <button class="icn-btn del" data-del="${r.id}" title="Delete">${icon("trash")}</button>
        </div></td></tr>`).join("") : `<tr><td colspan="${sc.columns.length + 1}"><div class="empty" style="padding:2rem">No records. Click “Add”.</div></td></tr>`;
      body.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => openForm(key, S.find(sc.col, b.dataset.edit)));
      body.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
        const row = S.find(sc.col, b.dataset.del);
        if (confirm("Delete this record permanently?")) {
          try { await S.remove(sc.col, row.id); U.toast("Deleted", "ok"); draw(); }
          catch (e) { U.toast(e.message, "err"); }
        }
      });
    }
    document.getElementById("add-btn").onclick = () => openForm(key, null);
    document.getElementById("tbl-search").addEventListener("input", (e) => { q = e.target.value; draw(); });
    draw();
    main._redraw = draw;
  }

  /* ---- form modal ---- */
  function fieldValue(row, f) {
    const v = row ? row[f.n] : undefined;
    if (f.t === "csv") return (v || []).join(", ");
    if (f.t === "json") return JSON.stringify(v != null ? v : [], null, 2);
    if (f.t === "datetime") { try { return v ? new Date(v).toISOString().slice(0, 16) : ""; } catch (e) { return ""; } }
    return v == null ? "" : v;
  }
  function renderField(f, row) {
    const val = fieldValue(row, f);
    const id = "fld-" + f.n;
    let control;
    if (f.t === "textarea" || f.t === "json") {
      control = `<textarea class="textarea" id="${id}" ${f.big ? 'style="min-height:180px"' : ""} ${f.t === "json" ? 'style="font-family:monospace;font-size:.85rem;min-height:120px"' : ""}>${esc(val)}</textarea>`;
    } else if (f.t === "select") {
      const opts = f.opts().map((o) => `<option value="${esc(o.v)}" ${String(o.v) === String(val) ? "selected" : ""}>${esc(o.l)}</option>`).join("");
      control = `<select class="select" id="${id}">${opts}</select>`;
    } else if (f.t === "image") {
      control = `<input class="input" id="${id}" placeholder="Image URL (or upload →)" value="${esc(val)}">
        <input type="file" accept="image/*" id="${id}-file" style="margin-top:.4rem;font-size:.82rem">
        <div class="help">Paste a URL, or upload an image (stored inline for this demo).</div>`;
    } else {
      const type = f.t === "number" ? "number" : f.t === "date" ? "date" : f.t === "time" ? "time" : f.t === "datetime" ? "datetime-local" : "text";
      control = `<input class="input" id="${id}" type="${type}" value="${esc(val)}" ${f.req ? "required" : ""}>`;
    }
    return `<div class="field"><label>${f.l}${f.req ? ' <span style="color:var(--red-500)">*</span>' : ""}</label>${control}${f.help ? `<span class="help">${esc(f.help)}</span>` : ""}</div>`;
  }

  function openForm(key, row) {
    const sc = SCHEMAS[key];
    const isEdit = !!row;
    const editing = isEdit ? row : sc.def();
    // Users: add a password field only when creating
    let fields = sc.fields.slice();
    if (key === "users" && !isEdit) fields.push({ n: "_password", l: "Password", t: "text", req: true, help: "Min 6 characters." });

    const back = document.createElement("div");
    back.className = "modal-back";
    back.innerHTML = `<div class="modal"><div class="m-head"><h2 style="font-size:1.2rem;margin:0">${isEdit ? "Edit" : "Add"} — ${sc.title}</h2><button class="icon-btn" id="m-close">${icon("close")}</button></div>
      <div class="m-body"><form id="m-form">${fields.map((f) => renderField(f, isEdit ? row : editing)).join("")}</form></div>
      <div class="m-foot"><button class="btn ghost" id="m-cancel">Cancel</button><button class="btn" id="m-save">${isEdit ? "Save changes" : "Create"}</button></div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.querySelector("#m-close").onclick = close;
    back.querySelector("#m-cancel").onclick = close;
    back.onclick = (e) => { if (e.target === back) close(); };

    // wire image file inputs → dataURL into the URL input
    fields.filter((f) => f.t === "image").forEach((f) => {
      const file = back.querySelector("#fld-" + f.n + "-file");
      if (file) file.onchange = () => {
        const fl = file.files[0]; if (!fl) return;
        if (fl.size > 1.5 * 1024 * 1024) { U.toast("Image too large (max 1.5MB for demo)", "err"); return; }
        const rd = new FileReader(); rd.onload = () => { back.querySelector("#fld-" + f.n).value = rd.result; U.toast("Image attached", "ok"); }; rd.readAsDataURL(fl);
      };
    });

    const saveBtn = back.querySelector("#m-save");
    saveBtn.onclick = async () => {
      const out = {};
      try {
        for (const f of fields) {
          const elm = back.querySelector("#fld-" + f.n);
          let v = elm ? elm.value : "";
          if (f.req && (v === "" || v == null)) { throw new Error(f.l + " is required."); }
          if (f.t === "number") v = v === "" ? null : Number(v);
          else if (f.t === "csv") v = v.split(",").map((x) => x.trim()).filter(Boolean);
          else if (f.t === "json") { try { v = v.trim() ? JSON.parse(v) : []; } catch (e) { throw new Error(f.l + ": invalid JSON — " + e.message); } }
          else if (f.t === "datetime") v = v ? new Date(v).toISOString() : new Date().toISOString();
          out[f.n] = v;
        }
      } catch (e) { U.toast(e.message, "err"); return; }

      // Users: pass the plaintext password as `password`; the store hashes (local)
      // or the API hashes server-side (bcrypt). Never send a client-side hash.
      if (key === "users" && !isEdit) {
        out.email = (out.email || "").trim().toLowerCase();
        if (!out._password || out._password.length < 6) { U.toast("Password must be at least 6 characters", "err"); return; }
        out.password = out._password;
        delete out._password;
      } else if (key === "users") {
        out.email = (out.email || "").trim().toLowerCase();
        delete out._password;
      }

      saveBtn.disabled = true;
      try {
        if (isEdit) await S.update(sc.col, row.id, out);
        else await S.add(sc.col, out);
      } catch (e) { saveBtn.disabled = false; U.toast(e.message, "err"); return; }

      U.toast(isEdit ? "Changes saved" : "Created", "ok");
      close();
      const main = document.getElementById("admin-main");
      if (main && main._redraw) main._redraw();
      U.renderTicker && U.renderTicker();
    };
  }

  function quickNew(key, ev) { if (ev) ev.preventDefault(); U.go(secHref(key)); setTimeout(() => openForm(key, null), 60); }

  /* ---- comments moderation (FR-11) ---- */
  function commentsModule(main) {
    let filter = "all";
    main.innerHTML = `
      <div class="admin-top"><div><h1 style="margin:0">💬 Comments</h1><p class="muted" style="margin:0">Approve, flag, or delete user comments.</p></div></div>
      <div class="filters" id="cfilters">
        ${["all", "pending", "approved", "flagged"].map((f) => `<button class="pill${f === "all" ? " active" : ""}" data-f="${f}">${f[0].toUpperCase() + f.slice(1)}</button>`).join("")}
      </div>
      <div id="cbody"></div>`;
    function draw() {
      let list = S.all("comments").slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      if (filter !== "all") list = list.filter((c) => c.status === filter);
      document.getElementById("cbody").innerHTML = list.length ? `<div class="grid" style="gap:.7rem">${list.map((c) => {
        const n = S.news1(c.postId);
        return `<div class="card" style="padding:1rem;flex-direction:row;justify-content:space-between;gap:1rem;align-items:flex-start">
          <div><div style="display:flex;gap:.5rem;align-items:center;margin-bottom:.3rem"><span class="av" style="width:32px;height:32px;font-size:.8rem;border-radius:50%;display:grid;place-items:center;background:var(--primary-soft);color:var(--primary);font-weight:800">${initials(c.author)}</span><b>${esc(c.author)}</b> <span class="chip ${c.status === "approved" ? "gold" : c.status === "flagged" ? "live" : ""}">${esc(c.status)}</span></div>
            <p style="margin:.2rem 0">${esc(c.text)}</p>
            <span class="help">on ${n ? `“${esc(n.title)}”` : "a post"} · ${U.timeAgo(c.createdAt)}</span></div>
          <div class="row-actions">
            ${c.status !== "approved" ? `<button class="icn-btn" title="Approve" data-app="${c.id}">${icon("check")}</button>` : ""}
            <button class="icn-btn" title="Flag" data-flag="${c.id}">🚩</button>
            <button class="icn-btn del" title="Delete" data-del="${c.id}">${icon("trash")}</button>
          </div></div>`;
      }).join("")}</div>` : `<div class="empty"><div class="ball">💬</div><p>No comments here.</p></div>`;
      const doMod = async (id, status, msg) => { try { await S.moderateComment(id, status); U.toast(msg, "ok"); draw(); } catch (e) { U.toast(e.message, "err"); } };
      document.querySelectorAll("[data-app]").forEach((b) => b.onclick = () => doMod(b.dataset.app, "approved", "Approved"));
      document.querySelectorAll("[data-flag]").forEach((b) => b.onclick = () => doMod(b.dataset.flag, "flagged", "Flagged"));
      document.querySelectorAll("#cbody [data-del]").forEach((b) => b.onclick = async () => { if (confirm("Delete this comment?")) { try { await S.remove("comments", b.dataset.del); U.toast("Deleted", "ok"); draw(); } catch (e) { U.toast(e.message, "err"); } } });
    }
    document.getElementById("cfilters").querySelectorAll(".pill").forEach((b) => b.onclick = () => {
      document.querySelectorAll("#cfilters .pill").forEach((x) => x.classList.remove("active"));
      b.classList.add("active"); filter = b.dataset.f; draw();
    });
    draw();
  }

  return { render, quickNew };
})();
