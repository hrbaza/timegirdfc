/* =========================================================================
   Time Grid FC — App bootstrap + hash router
   Runs in two modes depending on the page:
     • public  (index.html)      → full site; #/admin redirects to admin.html
     • admin   (admin.html, body[data-app="admin"]) → Admin Panel only
   ========================================================================= */
(function () {
  const S = TG.store, U = TG.ui, P = TG.pages;
  const ADMIN_MODE = document.body && document.body.getAttribute("data-app") === "admin";

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, "");
    const [path, query] = raw.split("?");
    const seg = path.split("/").filter(Boolean);
    const params = {};
    if (query) query.split("&").forEach((kv) => { const [k, v] = kv.split("="); params[decodeURIComponent(k)] = decodeURIComponent(v || ""); });
    return { seg, params };
  }

  /* ---- Admin page router (admin.html): every route is an admin section ---- */
  function routeAdmin() {
    const app = document.getElementById("tg-app");
    const { seg } = parseHash();
    const section = seg[0] || "dashboard";
    try {
      TG.admin.render(app, section);
    } catch (e) {
      console.error("Admin route error:", e);
      app.innerHTML = `<section class="wrap section"><div class="empty"><div class="ball">⚽</div><p>Something went wrong.</p><p class="help">${U.esc(e.message)}</p></div></section>`;
    }
    if (app.focus) app.focus({ preventScroll: true });
  }

  /* ---- Public site router (index.html) ---- */
  function routePublic() {
    const app = document.getElementById("tg-app");
    const { seg, params } = parseHash();
    const r = seg[0] || "";
    const id = seg[1] || "";

    // Admin now lives on its own page.
    if (r === "admin") { location.href = "admin.html" + (id ? "#/" + id : ""); return; }

    const navKey = ({ player: "players", team: "teams" }[r]) || r;
    U.setActiveNav(navKey);

    try {
      switch (r) {
        case "": P.home(app); break;
        case "news": id ? P.newsPost(app, { id }) : P.news(app); break;
        case "players": id ? P.playersCountry(app, { code: id }) : P.players(app); break;
        case "player": P.player(app, { id }); break;
        case "teams": P.teams(app); break;
        case "team": P.team(app, { id }); break;
        case "schedule": P.schedule(app); break;
        case "leagues": id ? P.league(app, { id }) : P.leagues(app); break;
        case "worldcup": P.worldcup(app); break;
        case "awards": id ? P.award(app, { id }) : P.awards(app); break;
        case "transfers": P.transfers(app); break;
        case "videos": P.videos(app); break;
        case "about": P.about(app); break;
        case "contact": P.contact(app); break;
        case "privacy": P.privacy(app); break;
        case "terms": P.terms(app); break;
        case "signin": P.signin(app); break;
        case "signup": P.signup(app); break;
        case "account": P.account(app); break;
        default: P.notFound(app);
      }
    } catch (e) {
      console.error("Route error:", e);
      app.innerHTML = `<section class="wrap section"><div class="empty"><div class="ball">⚽</div><p>Something went wrong rendering this page.</p><p class="help">${U.esc(e.message)}</p></div></section>`;
    }
    if (app.focus) app.focus({ preventScroll: true });
  }

  async function boot() {
    U.applyTheme(S.getTheme());
    const app = document.getElementById("tg-app");
    app.innerHTML = `<div class="loader"><div class="ball">⚽</div></div>`;

    await S.init();
    console.log(`[Time Grid FC] data mode: ${S.mode()}${S.isApi() ? " (MongoDB backend)" : " (offline localStorage demo)"}`);

    if (ADMIN_MODE) {
      U.initCursor();
      U.initScroll();
      U.renderAdminHeader();
      window.addEventListener("hashchange", routeAdmin);
      routeAdmin();
    } else {
      U.renderHeader();
      U.renderFooter();
      U.init(); // cursor + scroll + search + key shortcuts
      window.addEventListener("hashchange", routePublic);
      if (!location.hash) location.replace("#/");
      routePublic();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
