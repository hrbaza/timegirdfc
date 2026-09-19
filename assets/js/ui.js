/* =========================================================================
   Time Grid FC — UI layer (shell, helpers, chrome)
   Header/nav, footer, custom football cursor, theme, search, toasts, icons.
   ========================================================================= */
window.TG = window.TG || {};
TG.ui = (function () {
  const store = TG.store;

  /* ---- tiny helpers ---- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function initials(name) {
    return (name || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  }
  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
    catch (e) { return iso; }
  }
  function timeAgo(iso) {
    const s = (Date.now() - new Date(iso)) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    if (s < 604800) return Math.floor(s / 86400) + "d ago";
    return fmtDate(iso);
  }
  function fmtDay(dateStr) {
    const today = store.localDate(new Date());
    const tmr = store.localDate(new Date(Date.now() + 86400000));
    if (dateStr === today) return "Today";
    if (dateStr === tmr) return "Tomorrow";
    try { return new Date(dateStr).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }); }
    catch (e) { return dateStr; }
  }
  // Navigate to an internal route. Uses real path URLs (History API) on the web
  // so each page is separately indexable; falls back to hash routing on file://.
  function go(to) {
    let path = String(to == null ? "/" : to).replace(/^#/, "");
    if (path.charAt(0) !== "/") path = "/" + path;
    if (location.protocol !== "file:") {
      if (path !== location.pathname + location.search) history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    } else {
      if (location.hash !== "#" + path) location.hash = path;
      else window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  }

  /* ---- Flags (Windows Chrome can't render flag emoji → use images + badge fallback) ---- */
  const ISO = { EN: "gb-eng" }; // our codes → flagcdn ISO
  function flagIso(iso, w) {
    w = w || 22; const h = Math.round(w * 0.72);
    const code = (iso || "").toUpperCase().replace("GB-ENG", "EN");
    // Always request a valid standard flagcdn size (80x60); scale down via width/height attrs.
    return `<img class="flagimg" width="${w}" height="${h}" alt="" loading="lazy"
      src="https://flagcdn.com/80x60/${iso}.png"
      onerror="TG.ui.flagFallback(this,'${esc(code)}')">`;
  }
  function flag(code, w) { return flagIso((ISO[code] || code || "").toLowerCase(), w); }
  // Flag image that fills its container (for team crest avatars); on error reveals initials behind it.
  function flagFill(code) {
    const iso = (ISO[code] || code || "").toLowerCase();
    if (!iso) return "";
    return `<img src="https://flagcdn.com/80x60/${iso}.png" alt="" loading="lazy" onerror="this.remove()">`;
  }
  function flagFallback(img, code) {
    const s = document.createElement("span"); s.className = "flagbadge"; s.textContent = code || "?";
    if (img && img.replaceWith) img.replaceWith(s);
  }
  // League/competition flag: map to a country image where possible, else keep its emoji.
  const COMP_ISO = { England: "gb-eng", Germany: "de", Italy: "it", Spain: "es", France: "fr", "United States": "us" };
  function compFlag(l, w) {
    if (l && COMP_ISO[l.country]) return flagIso(COMP_ISO[l.country], w);
    return `<span class="compemoji">${(l && l.flag) || "🏆"}</span>`;
  }

  /* ---- SEO meta (client-side; for full crawlability add SSR/prerender, SRS 7.4) ---- */
  const SITE = "Time Grid FC";
  function upsert(sel, make) { let el = document.head.querySelector(sel); if (!el) { el = make(); document.head.appendChild(el); } return el; }
  function metaName(name, content) { upsert(`meta[name="${name}"]`, () => { const m = document.createElement("meta"); m.name = name; return m; }).setAttribute("content", content || ""); }
  function metaProp(prop, content) { upsert(`meta[property="${prop}"]`, () => { const m = document.createElement("meta"); m.setAttribute("property", prop); return m; }).setAttribute("content", content || ""); }
  function setCanonical(url) { upsert('link[rel="canonical"]', () => { const l = document.createElement("link"); l.rel = "canonical"; return l; }).setAttribute("href", url); }
  function setJsonLd(obj) {
    let el = document.getElementById("tg-jsonld");
    if (obj) { if (!el) { el = document.createElement("script"); el.type = "application/ld+json"; el.id = "tg-jsonld"; document.head.appendChild(el); } el.textContent = JSON.stringify(obj); }
    else if (el) { el.remove(); }
  }

  function setMeta(title, desc) {
    const full = title ? `${title} — ${SITE}` : `${SITE} — Football News, Stats & Community`;
    document.title = full;
    if (desc) metaName("description", desc);
    // Open Graph / Twitter for a standard page
    metaProp("og:title", full);
    if (desc) metaProp("og:description", desc);
    metaProp("og:type", "website");
    metaProp("og:site_name", SITE);
    metaProp("og:url", location.href);
    metaName("twitter:card", "summary_large_image");
    metaName("twitter:title", full);
    if (desc) metaName("twitter:description", desc);
    setCanonical(location.href);
    setJsonLd(null); // clear any article schema from a previous page
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  // Rich SEO for an article: meta description, OG article tags, Twitter, canonical, JSON-LD NewsArticle.
  function setArticleSEO(n) {
    const desc = n.metaDescription || n.excerpt || "";
    document.title = `${n.title} — ${SITE}`;
    metaName("description", desc);
    if (n.keywords && n.keywords.length) metaName("keywords", n.keywords.join(", "));
    metaProp("og:type", "article");
    metaProp("og:title", n.title);
    metaProp("og:description", desc);
    metaProp("og:site_name", SITE);
    metaProp("og:url", location.href);
    if (n.cover) metaProp("og:image", n.cover);
    metaProp("article:published_time", n.publishedAt || "");
    metaProp("article:modified_time", n.updatedAt || n.publishedAt || "");
    metaProp("article:section", n.category || "");
    metaName("twitter:card", "summary_large_image");
    metaName("twitter:title", n.title);
    metaName("twitter:description", desc);
    if (n.cover) metaName("twitter:image", n.cover);
    setCanonical(location.href);
    setJsonLd({
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": n.title,
      "description": desc,
      "image": n.cover ? [n.cover] : undefined,
      "datePublished": n.publishedAt,
      "dateModified": n.updatedAt || n.publishedAt,
      "author": { "@type": "Organization", "name": n.author || SITE },
      "publisher": { "@type": "Organization", "name": SITE },
      "mainEntityOfPage": { "@type": "WebPage", "@id": location.href },
      "articleSection": n.category,
      "keywords": (n.keywords || n.tags || []).join(", "),
    });
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  /* ---- Icons ---- */
  const I = {
    search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    sun: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    user: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    arrow: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    play: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    edit: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    trash: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    check: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>',
    ball: '<svg width="22" height="22" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="currentColor"/><path d="M50 24l16 11-6 19H40l-6-19z" fill="var(--bg-2)"/></svg>',
  };
  const icon = (n) => I[n] || "";

  /* ---- Nav definition ---- */
  const NAV = [
    ["", "Home"], ["news", "News"], ["players", "Players"], ["teams", "Teams"],
    ["leagues", "Leagues"], ["worldcup", "World Cup"], ["awards", "Awards"],
    ["transfers", "Transfers"], ["schedule", "Schedule"], ["videos", "Videos"], ["about", "About"],
  ];

  /* ---- Header ---- */
  function renderHeader() {
    if (!document.getElementById("tg-header")) return;
    const u = store.currentUser();
    const theme = store.getTheme();
    const links = NAV.map(([r, l]) => `<a href="/${r}" data-route="${r}">${l}</a>`).join("");
    const userCtl = u
      ? `<a href="/account" class="icon-btn" title="${esc(u.name)}" aria-label="Account">${initials(u.name)}</a>`
      : `<a href="/signin" class="btn sm ghost" style="height:40px">Sign In</a>`;
    document.getElementById("tg-header").innerHTML = `
      <div class="ticker" id="tg-ticker"></div>
      <nav class="nav">
        <div class="nav-inner">
          <a href="/" class="brand" aria-label="Time Grid FC home">
            <span class="ball">${ballSVG()}</span> Time<b>Grid</b>FC
          </a>
          <div class="nav-links" id="tg-navlinks">
            <button class="nav-mob-search" id="tg-nav-search" aria-label="Search">${I.search}<span>Search players, teams, news…</span></button>
            ${links}
          </div>
          <div class="nav-actions">
            <button class="icon-btn" id="tg-search-btn" aria-label="Search" title="Search (press /)">${I.search}</button>
            <button class="icon-btn" id="tg-theme-btn" aria-label="Toggle theme" title="Toggle theme">${theme === "dark" ? I.sun : I.moon}</button>
            ${userCtl}
            <button class="icon-btn hamburger" id="tg-menu-btn" aria-label="Menu">${I.menu}</button>
          </div>
        </div>
      </nav>`;
    renderTicker();
    wireHeader();
  }

  // Slim top bar for the standalone admin page (admin.html).
  function renderAdminHeader() {
    const el = document.getElementById("tg-header");
    if (!el) return;
    const theme = store.getTheme();
    el.innerHTML = `
      <nav class="nav">
        <div class="nav-inner">
          <a href="index.html" class="brand" aria-label="Time Grid FC home">
            <span class="ball">${ballSVG()}</span> Time<b>Grid</b>FC <span class="chip" style="margin-left:.2rem">Admin</span>
          </a>
          <div style="flex:1"></div>
          <div class="nav-actions">
            <button class="icon-btn" id="tg-theme-btn" aria-label="Toggle theme" title="Toggle theme">${theme === "dark" ? I.sun : I.moon}</button>
            <a class="btn sm ghost" href="index.html" style="height:40px">🌐 View site</a>
          </div>
        </div>
      </nav>`;
    const tb = document.getElementById("tg-theme-btn");
    if (tb) tb.onclick = toggleTheme;
  }

  function renderTicker() {
    const host = document.getElementById("tg-ticker");
    if (!host) return;
    const t = store.fixturesToday();
    const items = [];
    store.fixturesUpcoming().slice(0, 6).forEach((f) => {
      const h = store.team(f.home), a = store.team(f.away);
      const live = f.status === "live";
      items.push(`<span>${live ? "🔴 LIVE " : "⚽ "}${esc(h ? h.name : "")} ${live ? (f.hs + "–" + f.as) : "vs"} ${esc(a ? a.name : "")} ${live ? "" : "· " + fmtDay(f.date) + " " + f.time}</span>`);
    });
    store.all("transfers").slice(0, 3).forEach((tr) => {
      items.push(`<span>🔄 ${esc(tr.playerName)} → ${esc(tr.to)}</span>`);
    });
    if (!items.length) items.push("<span>⚽ Welcome to Time Grid FC</span>");
    const run = items.join("");
    host.innerHTML = `<div class="run">${run}${run}</div>`;
  }

  function ballSVG() {
    return `<svg viewBox="0 0 100 100" width="30" height="30"><circle cx="50" cy="50" r="47" fill="#fff" stroke="#0f172a" stroke-width="4"/><path d="M50 22l17 12-6.5 20.5h-21L33 34z" fill="#0f172a"/><path d="M22 44l14 10-5 16-14-3z" fill="#0f172a" opacity=".85"/><path d="M78 44l-14 10 5 16 14-3z" fill="#0f172a" opacity=".85"/><path d="M38 78l6-15h12l6 15-12 6z" fill="#0f172a" opacity=".85"/></svg>`;
  }

  function wireHeader() {
    document.getElementById("tg-search-btn").onclick = openSearch;
    document.getElementById("tg-theme-btn").onclick = toggleTheme;
    const menuBtn = document.getElementById("tg-menu-btn");
    const links = document.getElementById("tg-navlinks");
    menuBtn.onclick = () => links.classList.toggle("open");
    links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => links.classList.remove("open")));
    const navSearch = document.getElementById("tg-nav-search");
    if (navSearch) navSearch.onclick = () => { links.classList.remove("open"); openSearch(); };
  }

  function setActiveNav(route) {
    document.querySelectorAll("#tg-navlinks a").forEach((a) => {
      a.classList.toggle("active", a.getAttribute("data-route") === route);
    });
  }

  /* ---- Footer ---- */
  function renderFooter() {
    if (!document.getElementById("tg-footer")) return;
    const col = (title, links) => `<div><h4>${title}</h4>${links.map(([h, l]) => `<a href="${h}">${l}</a>`).join("")}</div>`;
    document.getElementById("tg-footer").innerHTML = `
      <div class="wrap foot">
        <div>
          <div class="brand" style="margin-bottom:.6rem"><span class="ball">${ballSVG()}</span> Time<b>Grid</b>FC</div>
          <p class="muted" style="max-width:34ch">Football news, stats & community — the official companion to the Time Grid FC YouTube channel.</p>
          <a class="btn gold sm" href="https://www.youtube.com/@timegrid_fc" target="_blank" rel="noopener">▶ Subscribe on YouTube</a>
        </div>
        ${col("Explore", [["/news", "News"], ["/players", "Players"], ["/teams", "Teams"], ["/schedule", "Schedule"], ["/videos", "Videos"]])}
        ${col("Competitions", [["/leagues", "Leagues"], ["/worldcup", "World Cup"], ["/awards", "Awards"], ["/transfers", "Transfers"]])}
        ${col("Company", [["/about", "About Us"], ["/contact", "Contact"], ["/privacy", "Privacy Policy"], ["/terms", "Terms & Disclaimer"]])}
      </div>
      <div class="wrap foot-bottom">
        <span>© ${new Date().getFullYear()} Time Grid FC. All rights reserved.</span>
        <span><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/contact">Contact</a></span>
      </div>`;
  }

  /* ---- Theme ---- */
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    store.setTheme(t);
    const btn = document.getElementById("tg-theme-btn");
    if (btn) btn.innerHTML = t === "dark" ? I.sun : I.moon;
  }
  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme");
    applyTheme(cur === "dark" ? "light" : "dark");
  }

  /* ---- Custom football cursor (FR/UI §8) ---- */
  function initCursor() {
    const c = document.getElementById("tg-cursor");
    if (!c) return;
    let x = 0, y = 0;
    window.addEventListener("mousemove", (e) => {
      x = e.clientX; y = e.clientY;
      c.style.setProperty("--x", (x - 14) + "px");
      c.style.setProperty("--y", (y - 14) + "px");
      if (!c.classList.contains("kick")) c.style.transform = `translate(${x - 14}px,${y - 14}px)`;
    }, { passive: true });
    window.addEventListener("mousedown", () => {
      c.classList.remove("kick"); void c.offsetWidth; c.classList.add("kick");
      setTimeout(() => c.classList.remove("kick"), 460);
    });
  }

  /* ---- Scroll progress + reveal ---- */
  function initScroll() {
    const bar = document.getElementById("tg-progress");
    window.addEventListener("scroll", () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
    }, { passive: true });
  }
  let revealObs;
  function observeReveals(root) {
    if (!("IntersectionObserver" in window)) {
      (root || document).querySelectorAll(".reveal").forEach((e) => e.classList.add("in")); return;
    }
    if (!revealObs) {
      revealObs = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); revealObs.unobserve(en.target); } });
      }, { threshold: 0.08 });
    }
    (root || document).querySelectorAll(".reveal:not(.in)").forEach((e) => revealObs.observe(e));
  }

  /* ---- Toast ---- */
  function toast(msg, type) {
    const host = document.getElementById("tg-toast");
    const t = document.createElement("div");
    t.className = "toast" + (type ? " " + type : "");
    t.innerHTML = (type === "ok" ? I.check : "") + "<span>" + esc(msg) + "</span>";
    host.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transform = "translateY(10px)"; setTimeout(() => t.remove(), 300); }, 2600);
  }

  /* ---- Global search overlay (FR-12) ---- */
  function openSearch() {
    const ov = document.getElementById("tg-search-overlay");
    if (!ov) return;
    ov.hidden = false;
    ov.innerHTML = `
      <div class="search-panel" role="dialog" aria-label="Search">
        <div class="top">${I.search}<input id="tg-search-input" placeholder="Search players, teams, news, competitions…" autocomplete="off" />
          <button class="icon-btn" id="tg-search-close" aria-label="Close">${I.close}</button></div>
        <div class="search-results" id="tg-search-results"><div class="empty" style="padding:2rem">Start typing to search…</div></div>
      </div>`;
    const input = document.getElementById("tg-search-input");
    input.focus();
    input.addEventListener("input", () => renderSearchResults(input.value));
    document.getElementById("tg-search-close").onclick = closeSearch;
    ov.onclick = (e) => { if (e.target === ov) closeSearch(); };
  }
  function closeSearch() { const ov = document.getElementById("tg-search-overlay"); if (!ov) return; ov.hidden = true; ov.innerHTML = ""; }
  function renderSearchResults(q) {
    const box = document.getElementById("tg-search-results");
    if (!box) return;
    if (!q.trim()) { box.innerHTML = `<div class="empty" style="padding:2rem">Start typing to search…</div>`; return; }
    const r = store.search(q);
    const total = r.players.length + r.teams.length + r.news.length + r.leagues.length;
    if (!total) { box.innerHTML = `<div class="empty" style="padding:2rem">No results for “${esc(q)}”.</div>`; return; }
    const grp = (title, items) => items.length ? `<div class="sr-group"><h4>${title}</h4>${items.join("")}</div>` : "";
    const item = (href, ic, t, s) => `<a class="sr-item" href="${href}" onclick="TG.ui.closeSearch()"><span class="ic">${ic}</span><span><div class="t">${esc(t)}</div><div class="s">${esc(s)}</div></span></a>`;
    box.innerHTML =
      grp("Players", r.players.map((p) => { const c = store.country(p.country); return item(`/player/${p.id}`, initials(p.name), p.name, `${p.pos} · ${c ? c.name : ""}`); })) +
      grp("Teams", r.teams.map((t) => item(`/team/${t.id}`, t.crest || initials(t.name), t.name, t.stadium))) +
      grp("News", r.news.map((n) => item(`/news/${n.id}`, "📰", n.title, n.category))) +
      grp("Competitions", r.leagues.map((l) => item(`/leagues/${l.id}`, compFlag(l), l.name, l.country)));
  }

  /* ---- Cookie consent (GDPR / AdSense expectation) ---- */
  function initCookieConsent() {
    let done = null;
    try { done = localStorage.getItem("tg_cookie_consent"); } catch (e) {}
    if (done) return;
    const bar = document.createElement("div");
    bar.className = "cookie-bar";
    bar.innerHTML = `
      <span>We use cookies to keep you signed in, remember your preferences, and — where enabled — to help serve and measure ads. See our <a href="/privacy">Privacy Policy</a>.</span>
      <span class="cb-actions">
        <button class="btn sm ghost" id="cb-no">Decline</button>
        <button class="btn sm" id="cb-yes">Accept</button>
      </span>`;
    document.body.appendChild(bar);
    const close = (v) => { try { localStorage.setItem("tg_cookie_consent", v); } catch (e) {} bar.remove(); };
    bar.querySelector("#cb-yes").onclick = () => close("accepted");
    bar.querySelector("#cb-no").onclick = () => close("declined");
  }

  /* ---- keyboard shortcuts ---- */
  function initKeys() {
    window.addEventListener("keydown", (e) => {
      if (e.key === "/" && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
      if (e.key === "Escape") closeSearch();
    });
  }

  return {
    esc, initials, fmtDate, timeAgo, fmtDay, go, icon, setMeta, setArticleSEO,
    flag, flagIso, flagFallback, flagFill, compFlag,
    renderHeader, renderAdminHeader, renderFooter, setActiveNav, renderTicker,
    applyTheme, toggleTheme, initCursor, initScroll, observeReveals,
    toast, openSearch, closeSearch, ballSVG,
    init() { initCursor(); initScroll(); initKeys(); initCookieConsent(); },
  };
})();
