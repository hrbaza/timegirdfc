/* =========================================================================
   Time Grid FC — Store (data + persistence layer)
   Two modes, chosen automatically at init():
     • "api"   → talks to the MongoDB backend (assets/js/api.js). Data lives
                 in MongoDB; the store keeps an in-memory cache for fast,
                 synchronous reads by the UI.
     • "local" → no backend reachable: seeds from TG_SEED into localStorage
                 (the offline demo). Everything still works.
   Read helpers are synchronous (read the cache). Writes & auth are async.
   ========================================================================= */
window.TG = window.TG || {};
TG.store = (function () {
  const DB_KEY = "tg_db_v2"; // bump to invalidate stale offline caches
  const USER_SESSION = "tg_user";       // local mode: user id
  const ADMIN_SESSION = "tg_admin";     // local mode: admin id
  const USER_TOKEN = "tg_token";        // api mode: visitor JWT
  const ADMIN_TOKEN = "tg_admin_token"; // api mode: admin JWT
  const USER_OBJ = "tg_user_obj";       // api mode: cached user
  const ADMIN_OBJ = "tg_admin_obj";     // api mode: cached admin
  const THEME_KEY = "tg_theme";

  let db = null;
  let MODE = "local";
  let userToken = null, adminToken = null;
  const session = { user: null, admin: null };

  const uid = (p) => p + "-" + Math.random().toString(36).slice(2, 9);
  const nowISO = () => new Date().toISOString();
  const localDate = (d) => {
    const x = d || new Date();
    return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
  };
  // Demo-only password obfuscation for LOCAL mode. Real hashing is server-side (bcrypt).
  const hash = (s) => btoa(unescape(encodeURIComponent("tgfc::" + s))).split("").reverse().join("");
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const lsDel = (k) => { try { localStorage.removeItem(k); } catch (e) {} };

  const emptyDB = () => ({
    countries: [], teams: [], players: [], leagues: [], worldcups: [], awards: [],
    fixtures: [], news: [], transfers: [], videos: [], users: [], comments: [],
  });

  /* ================= LOCAL MODE (seed + localStorage) ================= */
  function seedDB() {
    const s = TG_SEED;
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    const fixtures = s.fixtures.map((f) => ({ ...f, date: localDate(new Date(midnight.getTime() + f.dayOffset * 86400000)) }));
    return {
      countries: clone(s.countries), teams: clone(s.teams), players: clone(s.players),
      leagues: clone(s.leagues), worldcups: clone(s.worldcups), awards: clone(s.awards),
      fixtures, news: clone(s.news), transfers: clone(s.transfers), videos: clone(s.videos),
      users: [
        { id: "u-admin", name: "Rehan (Admin)", email: "admin@timegridfc.com", pass: hash("admin123"), role: "Admin", createdAt: nowISO() },
        { id: "u-editor", name: "Editor", email: "editor@timegridfc.com", pass: hash("editor123"), role: "Editor", createdAt: nowISO() },
        { id: "u-fan", name: "Alex Fan", email: "fan@example.com", pass: hash("password"), role: "Visitor", createdAt: nowISO() },
      ],
      comments: [
        { id: uid("c"), postId: "n-1", userId: "u-fan", author: "Alex Fan", text: "What a game! Rodri was everywhere in midfield.", createdAt: nowISO(), status: "approved" },
        { id: uid("c"), postId: "n-1", userId: "u-fan", author: "Alex Fan", text: "Arsenal will bounce back, still a long season.", createdAt: nowISO(), status: "pending" },
        { id: uid("c"), postId: "n-2", userId: "u-fan", author: "Alex Fan", text: "Vini is unstoppable this year.", createdAt: nowISO(), status: "approved" },
      ],
    };
  }
  function loadLocal() {
    const raw = lsGet(DB_KEY);
    if (raw) { try { db = JSON.parse(raw); return; } catch (e) {} }
    db = seedDB(); persistLocal();
  }
  function persistLocal() { if (MODE === "local") lsSet(DB_KEY, JSON.stringify(db)); }

  /* ================= INIT ================= */
  async function init() {
    db = emptyDB();
    // Single request (with a timeout) instead of a separate health probe + bootstrap.
    // That saves a whole round-trip, which matters most on serverless cold starts.
    let boot = null;
    try { boot = TG.api && (await TG.api.request("/bootstrap", { timeout: 4500 })); } catch (e) { boot = null; }

    if (boot && boot.data) {
      MODE = "api";
      Object.assign(db, boot.data);
      db.users = db.users || [];
      db.comments = db.comments || [];

      userToken = lsGet(USER_TOKEN);
      adminToken = lsGet(ADMIN_TOKEN);
      // restore cached session objects immediately (sync), validate in background
      try { session.user = userToken ? JSON.parse(lsGet(USER_OBJ) || "null") : null; } catch (e) { session.user = null; }
      try { session.admin = adminToken ? JSON.parse(lsGet(ADMIN_OBJ) || "null") : null; } catch (e) { session.admin = null; }

      if (userToken) {
        try { const me = await TG.api.request("/auth/me", { token: userToken }); session.user = me.data; lsSet(USER_OBJ, JSON.stringify(me.data)); }
        catch (e) { clearUserSession(); }
      }
      if (adminToken) {
        try {
          const me = await TG.api.request("/auth/me", { token: adminToken });
          if (me.data && (me.data.role === "Admin" || me.data.role === "Editor")) {
            session.admin = me.data; lsSet(ADMIN_OBJ, JSON.stringify(me.data));
            await refreshAdminData();
          } else clearAdminSession();
        } catch (e) { clearAdminSession(); }
      }
    } else {
      MODE = "local";
      loadLocal();
      const uidStored = lsGet(USER_SESSION);
      const aidStored = lsGet(ADMIN_SESSION);
      session.user = uidStored ? find("users", uidStored) : null;
      const a = aidStored ? find("users", aidStored) : null;
      session.admin = a && (a.role === "Admin" || a.role === "Editor") ? a : null;
    }
    normalizeFixtures(); // keep fixture dates relative to today (both modes)
    return db;
  }

  async function refreshAdminData() {
    // Admin needs the full user list, all comments (incl. pending/flagged), and
    // all news (incl. drafts). Public read helpers still filter by status, so
    // loading drafts into the cache never leaks them to the public UI.
    try { const u = await TG.api.request("/users", { token: adminToken }); db.users = u.data || []; } catch (e) {}
    try { const c = await TG.api.request("/comments", { token: adminToken }); db.comments = c.data || []; } catch (e) {}
    try { const n = await TG.api.request("/news/manage", { token: adminToken }); if (n.data) db.news = n.data; } catch (e) {}
  }

  /* ================= generic accessors (sync, read cache) ================= */
  function all(col) { return (db && db[col]) ? db[col] : []; }
  function find(col, id) { return all(col).find((x) => x.id === id); }

  /* ================= writes (async; branch on MODE) ================= */
  async function add(col, obj) {
    if (MODE === "api") {
      const payload = { ...obj };
      const res = await TG.api.request("/" + col, { method: "POST", body: payload, token: adminToken });
      db[col].unshift(res.data); return res.data;
    }
    // local
    if (col === "users" && obj.password) { obj = { ...obj }; obj.pass = hash(obj.password); delete obj.password; }
    if (!obj.id) obj.id = uid(col.slice(0, 2));
    if (!obj.createdAt && (col === "users" || col === "comments")) obj.createdAt = nowISO();
    db[col].unshift(obj); persistLocal(); return obj;
  }
  async function update(col, id, patch) {
    // User password change: local mode hashes to `pass`; API mode sends the
    // plaintext for the server to hash (see userController.updateUser).
    if (col === "users" && patch && patch.password) {
      patch = { ...patch };
      if (MODE === "local") { patch.pass = hash(patch.password); delete patch.password; }
    }
    if (MODE === "api") {
      const res = await TG.api.request("/" + col + "/" + id, { method: "PUT", body: patch, token: adminToken });
      const i = db[col].findIndex((x) => x.id === id);
      if (i !== -1) db[col][i] = res.data; return res.data;
    }
    const i = db[col].findIndex((x) => x.id === id);
    if (i === -1) return null;
    db[col][i] = { ...db[col][i], ...patch }; persistLocal(); return db[col][i];
  }
  async function remove(col, id) {
    if (MODE === "api") {
      await TG.api.request("/" + col + "/" + id, { method: "DELETE", token: adminToken });
    }
    db[col] = db[col].filter((x) => x.id !== id); persistLocal();
  }
  async function resetAll() {
    if (MODE === "api") throw new Error("Reset is only available in offline demo mode. Re-run `npm run seed` on the server.");
    db = seedDB(); persistLocal();
  }

  /* ================= relationship lookups (sync) ================= */
  const team = (id) => find("teams", id);
  const player = (id) => find("players", id);
  const league = (id) => find("leagues", id);
  const award = (id) => find("awards", id);
  const country = (code) => all("countries").find((c) => c.code === code);
  const news1 = (id) => find("news", id);

  function playersByCountry(code) { return all("players").filter((p) => p.country === code); }
  function squad(teamId) { return all("players").filter((p) => p.club === teamId); }
  function countriesWithPlayers() {
    const counts = {};
    all("players").forEach((p) => { counts[p.country] = (counts[p.country] || 0) + 1; });
    return all("countries").map((c) => ({ ...c, count: counts[c.code] || 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }
  function awardsForPlayer(playerId) {
    const out = [];
    all("awards").forEach((a) => (a.winners || []).forEach((w) => {
      if (w.player === playerId) out.push({ award: a.name, icon: a.icon, awardId: a.id, year: w.year, club: w.club });
    }));
    return out.sort((x, y) => y.year - x.year);
  }

  const todayStr = () => localDate(new Date());
  // Keep demo fixture dates current: recompute date = today + dayOffset on every load.
  function normalizeFixtures() {
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    (db.fixtures || []).forEach((f) => {
      if (typeof f.dayOffset === "number") f.date = localDate(new Date(midnight.getTime() + f.dayOffset * 86400000));
    });
  }
  function fixturesToday() {
    const t = todayStr();
    return all("fixtures").filter((f) => f.date === t || f.status === "live");
  }
  function fixturesUpcoming() {
    const t = todayStr();
    // Live matches always show, regardless of date.
    return all("fixtures").filter((f) => (f.date >= t || f.status === "live") && f.status !== "finished")
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }
  function fixturesRecent() {
    return all("fixtures").filter((f) => f.status === "finished")
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }
  function publishedNews() {
    return all("news").filter((n) => n.status === "published")
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }
  function newsCategories() { return ["Match Analysis", "Player Analysis", "Transfer News", "General Football News", "World Cup News"]; }
  function allTimeTable(lg) {
    const counts = {};
    (lg.champions || []).forEach((c) => { counts[c.team] = (counts[c.team] || 0) + 1; });
    return Object.entries(counts).map(([team, titles]) => ({ team, titles })).sort((a, b) => b.titles - a.titles || a.team.localeCompare(b.team));
  }
  function worldCupTable(type) {
    const counts = {};
    all("worldcups").filter((w) => w.type === type).forEach((w) => { counts[w.champion] = (counts[w.champion] || 0) + 1; });
    return Object.entries(counts).map(([country, titles]) => ({ country, titles })).sort((a, b) => b.titles - a.titles || a.country.localeCompare(b.country));
  }

  /* ================= auth (async) ================= */
  function currentUser() { return session.user; }
  function currentAdmin() { return session.admin; }

  function clearUserSession() { userToken = null; session.user = null; lsDel(USER_TOKEN); lsDel(USER_OBJ); lsDel(USER_SESSION); }
  function clearAdminSession() { adminToken = null; session.admin = null; lsDel(ADMIN_TOKEN); lsDel(ADMIN_OBJ); lsDel(ADMIN_SESSION); }

  async function signUp({ name, email, password }) {
    if (!name || !email || !password) return { error: "All fields are required." };
    if (password.length < 6) return { error: "Password must be at least 6 characters." };
    try {
      if (MODE === "api") {
        const res = await TG.api.request("/auth/register", { method: "POST", body: { name, email, password } });
        userToken = res.token; session.user = res.data; lsSet(USER_TOKEN, userToken); lsSet(USER_OBJ, JSON.stringify(res.data));
        return { user: res.data };
      }
      email = email.trim().toLowerCase();
      if (all("users").some((u) => u.email === email)) return { error: "An account with this email already exists." };
      const u = await add("users", { name: name.trim(), email, pass: hash(password), role: "Visitor", createdAt: nowISO() });
      session.user = u; lsSet(USER_SESSION, u.id);
      return { user: u };
    } catch (e) { return { error: e.message }; }
  }
  async function signIn(email, password) {
    try {
      if (MODE === "api") {
        const res = await TG.api.request("/auth/login", { method: "POST", body: { email, password } });
        userToken = res.token; session.user = res.data; lsSet(USER_TOKEN, userToken); lsSet(USER_OBJ, JSON.stringify(res.data));
        return { user: res.data };
      }
      email = (email || "").trim().toLowerCase();
      const u = all("users").find((x) => x.email === email);
      if (!u || u.pass !== hash(password)) return { error: "Invalid email or password." };
      session.user = u; lsSet(USER_SESSION, u.id);
      return { user: u };
    } catch (e) { return { error: e.message }; }
  }
  function signOut() { clearUserSession(); }

  async function adminSignIn(email, password) {
    try {
      if (MODE === "api") {
        const res = await TG.api.request("/auth/admin/login", { method: "POST", body: { email, password } });
        adminToken = res.token; session.admin = res.data; lsSet(ADMIN_TOKEN, adminToken); lsSet(ADMIN_OBJ, JSON.stringify(res.data));
        await refreshAdminData();
        return { user: res.data };
      }
      email = (email || "").trim().toLowerCase();
      const u = all("users").find((x) => x.email === email);
      if (!u || u.pass !== hash(password)) return { error: "Invalid credentials." };
      if (u.role !== "Admin" && u.role !== "Editor") return { error: "This account does not have admin access." };
      session.admin = u; lsSet(ADMIN_SESSION, u.id);
      return { user: u };
    } catch (e) { return { error: e.message }; }
  }
  function adminSignOut() { clearAdminSession(); }

  /* ================= comments (async writes) ================= */
  function commentsFor(postId, includeAll) {
    return all("comments").filter((c) => c.postId === postId && (includeAll || c.status === "approved"))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  async function addComment(postId, text) {
    const u = currentUser();
    if (!u) return { error: "You must be signed in to comment." };
    if (!text || !text.trim()) return { error: "Comment cannot be empty." };
    try {
      if (MODE === "api") {
        const res = await TG.api.request("/comments", { method: "POST", body: { postId, text }, token: userToken });
        db.comments.unshift(res.data); return { comment: res.data };
      }
      const c = await add("comments", { postId, userId: u.id, author: u.name, text: text.trim(), createdAt: nowISO(), status: "approved" });
      return { comment: c };
    } catch (e) { return { error: e.message }; }
  }
  async function moderateComment(id, status) {
    if (MODE === "api") {
      const res = await TG.api.request("/comments/" + id + "/status", { method: "PATCH", body: { status }, token: adminToken });
      const i = db.comments.findIndex((c) => c.id === id);
      if (i !== -1) db.comments[i] = res.data; return res.data;
    }
    return update("comments", id, { status });
  }
  function pendingComments() { return all("comments").filter((c) => c.status === "pending"); }

  /* ================= theme + search (sync) ================= */
  function getTheme() { return lsGet(THEME_KEY) || "dark"; }
  function setTheme(t) { lsSet(THEME_KEY, t); }
  function search(q) {
    q = (q || "").trim().toLowerCase();
    if (!q) return { players: [], teams: [], news: [], leagues: [] };
    const m = (s) => (s || "").toLowerCase().includes(q);
    return {
      players: all("players").filter((p) => m(p.name) || m(p.pos)).slice(0, 6),
      teams: all("teams").filter((t) => m(t.name) || m(t.stadium)).slice(0, 6),
      news: publishedNews().filter((n) => m(n.title) || m(n.excerpt) || (n.tags || []).some(m)).slice(0, 6),
      leagues: all("leagues").filter((l) => m(l.name) || m(l.country)).slice(0, 6),
    };
  }

  return {
    init, all, find, add, update, remove, resetAll, uid, localDate,
    mode: () => MODE, isApi: () => MODE === "api",
    team, player, league, award, country, news1,
    playersByCountry, squad, countriesWithPlayers, awardsForPlayer,
    fixturesToday, fixturesUpcoming, fixturesRecent,
    publishedNews, newsCategories, allTimeTable, worldCupTable,
    currentUser, signUp, signIn, signOut,
    currentAdmin, adminSignIn, adminSignOut, refreshAdminData,
    commentsFor, addComment, moderateComment, pendingComments,
    getTheme, setTheme, search,
  };
})();
