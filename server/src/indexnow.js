/* =========================================================================
   Time Grid FC — IndexNow
   Tells IndexNow search engines (Bing, Yandex, Seznam, Naver and others; not
   Google) the moment an article is published, edited or deleted, so they
   recrawl it quickly.
   - The key is public by design: search engines check it at /<key>.txt.
     Set INDEXNOW_KEY to use a different one.
   - newsChange() is Express middleware for the admin news routes. It never
     blocks or fails the admin's save: the ping has a short time limit and
     errors are only logged.
   ========================================================================= */
const BASE = "https://www.timegridfc.com";
const HOST = "www.timegridfc.com";
const KEY = process.env.INDEXNOW_KEY || "ecb9c8e2f04bb50e1b0f378ac24ca83c";
const ENDPOINT = "https://api.indexnow.org/indexnow";

// Send up to 10,000 URLs of this site. Resolves { ok, status } and never throws.
async function submit(urls, timeoutMs) {
  const list = [...new Set((urls || []).filter((u) => typeof u === "string" && u.startsWith(BASE + "/")))];
  if (!list.length) return { ok: true, status: 0, sent: 0 };
  if (process.env.INDEXNOW_DISABLED === "1") return { ok: true, status: 0, sent: 0, disabled: true };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs || 2500);
  try {
    const r = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${BASE}/${KEY}.txt`, urlList: list.slice(0, 10000) }),
      signal: ctrl.signal,
    });
    // 200 = received, 202 = received and the key is still being checked.
    console.log(`[indexnow] ${r.status} for ${list.length} URL(s): ${list.slice(0, 3).join(", ")}${list.length > 3 ? " ..." : ""}`);
    return { ok: r.status === 200 || r.status === 202, status: r.status, sent: list.length };
  } catch (e) {
    console.error("[indexnow] failed:", e.message);
    return { ok: false, status: 0, error: e.message };
  } finally { clearTimeout(timer); }
}

// Public URL of an article id, or "" if it is not published.
async function articleUrl(id, fresh) {
  const { getSlugMap } = require("./utils/slug");
  try {
    const map = await getSlugMap(fresh);
    return map.byId[id] ? `${BASE}/news/${map.byId[id]}` : "";
  } catch (e) { return ""; }
}

// Middleware for POST / PUT / PATCH / DELETE on /api/news. Remembers the
// article's URL before the change, and after a successful save pings
// IndexNow with the old and new URLs plus the blog list, then sends the
// admin's response unchanged.
function newsChange(req, res, next) {
  const id = req.params && req.params.id;
  const before = id ? articleUrl(id, false) : Promise.resolve("");
  // Remember the saved document (create answers with it; delete answers 204).
  let body = null;
  const json = res.json.bind(res);
  res.json = (b) => { body = b; return json(b); };
  // Hold the final write until the ping is done: on a serverless host, work
  // started after the response ends may never run.
  const end = res.end.bind(res);
  res.end = (...args) => {
    if (res.statusCode >= 300) return end(...args);
    (async () => {
      try {
        const doc = body && body.data;
        const docId = id || (doc && (doc.id || doc._id));
        const urls = [await before];
        if (docId) urls.push(await articleUrl(docId, true)); // fresh map: new or renamed article
        if (urls.some(Boolean)) urls.push(`${BASE}/news`, `${BASE}/`);
        await submit(urls);
      } catch (e) { console.error("[indexnow] skipped:", e.message); }
      end(...args);
    })();
    return res;
  };
  next();
}

module.exports = { KEY, submit, newsChange };
