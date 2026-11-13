/* =========================================================================
   Time Grid FC — article URL slugs
   Every published article is served at /news/<slug-of-its-title>, e.g.
   "Manchester United and Tottenham Target Real Sociedad Striker Orri Óskarsson"
   → /news/manchester-united-and-tottenham-target-real-sociedad-striker-orri-oskarsson
   The slug is derived from the CURRENT title (no DB migration needed). Old id
   URLs (/news/n-pjmoyol) 301-redirect to the slug URL.
   Keep slugOf + assignSlugs in sync with the copy in assets/js/store.js.
   ========================================================================= */
const MAX_LEN = 120;

// Articles merged into another one (duplicate stories). The old article stays
// in the database but is hidden from lists, search and the sitemap, and its
// URLs (id or title slug) 301-redirect to the article it was merged into.
// Keep in sync with MERGED in assets/js/store.js.
const MERGED = {
  "n-oy6pnh1": "n-nr5sp9c", // Liverpool vs Man City preview (duplicate) -> newer preview
  "n-g2l116k": "n-f5obqs9", // "Kane Set to Break England Caps Record" -> England vs Croatia preview
  "n-s21ix27": "n-k7n4sqy", // Ballon d'Or "Kane the 2/5 Favourite" (betting odds) -> four-way race
  "n-3irkrth": "n-drqk4s2", // Messi "The Last Tango" -> "Messi's Last Dance at the Monumental"
};
const MERGED_IDS = Object.keys(MERGED);
// Articles whose cover image must not be shown (no rights to it). The article
// itself stays; its cover is dropped everywhere and its media URL returns 404.
const NO_COVER = {
  "n-97n42r2": "Sky Sports TV screenshot", // Neville slams Man Utd as 'classless'
};
// Mongo filter for articles the public may list. extraIds: more ids to leave out.
function publicNews(extra, extraIds) {
  return Object.assign({ status: "published", _id: { $nin: MERGED_IDS.concat(extraIds || []) } }, extra || {});
}
const EXTRA = { "ø": "o", "Ø": "o", "ß": "ss", "æ": "ae", "Æ": "ae", "œ": "oe", "Œ": "oe", "đ": "d", "Đ": "d", "ł": "l", "Ł": "l", "ı": "i" };

function slugOf(title) {
  let s = String(title || "")
    .replace(/[øØßæÆœŒđĐłŁı]/g, (c) => EXTRA[c])
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’‘`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (s.length > MAX_LEN) s = s.slice(0, MAX_LEN).replace(/-[^-]*$/, "");
  return s;
}

// list: published articles [{ id, title, publishedAt }]. Oldest article keeps the
// plain slug; a later article with the same title gets "-2", "-3", ...
function assignSlugs(list) {
  const byId = {}, bySlug = {};
  const sorted = list.slice().sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt) || String(a.id).localeCompare(String(b.id)));
  for (const n of sorted) {
    const base = slugOf(n.title) || String(n.id);
    let slug = base, i = 2;
    while (bySlug[slug]) slug = `${base}-${i++}`;
    byId[n.id] = slug; bySlug[slug] = n.id;
  }
  return { byId, bySlug };
}

/* ---- server-side cache of the published-article slug map ---- */
const TTL_MS = 60 * 1000;
let cache = null, cacheAt = 0, pending = null;

async function getSlugMap(force) {
  if (!force && cache && Date.now() - cacheAt < TTL_MS) return cache;
  if (pending) return pending;
  const News = require("../models/News");
  pending = News.find({ status: "published" }).select("_id title publishedAt").lean()
    .then((rows) => {
      const map = assignSlugs(rows.map((r) => ({ id: r._id, title: r.title, publishedAt: r.publishedAt })));
      // Merged articles: their old slug and id both point at the target's slug.
      map.redirectSlug = {};
      for (const [from, to] of Object.entries(MERGED)) {
        if (!map.byId[from] || !map.byId[to]) continue;
        map.redirectSlug[map.byId[from]] = map.byId[to];
        delete map.bySlug[map.byId[from]];
        map.byId[from] = map.byId[to];
      }
      cache = map;
      cacheAt = Date.now();
      return cache;
    })
    .finally(() => { pending = null; });
  return pending;
}

// Resolve a /news/<key> segment. Returns { id } for a slug, { redirect } for an
// old id URL or a stale "-2" suffix, or {} when nothing matches.
async function resolveNewsKey(key) {
  for (const force of [false, true]) {               // retry once with a fresh map (new article)
    const map = await getSlugMap(force);
    if (map.bySlug[key]) return { id: map.bySlug[key], slug: key };
    if (map.redirectSlug && map.redirectSlug[key]) return { redirect: map.redirectSlug[key] };
    if (map.byId[key]) return { redirect: map.byId[key] };
    const lower = slugOf(key);                        // /news/Some-Title or stray characters
    if (lower !== key && map.bySlug[lower]) return { redirect: lower };
    const stripped = key.replace(/-\d+$/, "");
    if (stripped !== key && map.bySlug[stripped]) return { redirect: stripped };
  }
  return {};
}

module.exports = { slugOf, assignSlugs, getSlugMap, resolveNewsKey, MERGED, NO_COVER, publicNews };
