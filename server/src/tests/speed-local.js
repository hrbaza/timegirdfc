/* Local check for the speed changes: bootstrap without bodies, resized WebP
   media, SSR card images + preload, cache headers and dates.
   The Mongoose models are replaced with small in-memory fakes, so no database
   is needed. Run: node server/src/tests/speed-local.js [cover.jpg] */
process.env.JWT_SECRET = process.env.JWT_SECRET || "speed-test-secret";
process.env.CLIENT_DIR = "..";
const fs = require("fs");
const path = require("path");

const jpg = process.argv[2] && fs.existsSync(process.argv[2]) ? fs.readFileSync(process.argv[2]) : null;
const now = Date.now();
const NEWS = Array.from({ length: 8 }, (_, i) => ({
  _id: "n-t" + i, title: "Test Article Number " + i, slug: "", category: i % 2 ? "Transfer News" : "Match Analysis",
  author: "Time Grid FC", excerpt: i === 3 ? "" : "Excerpt " + i, body: `<p>Body text ${i} `.padEnd(400, "x") + "</p>",
  tags: ["t"], status: "published", publishedAt: new Date(now - i * 3600e3), updatedAt: new Date(now - i * 3600e3 - 15e3),
  cover: i === 0 && jpg ? "data:image/jpeg;base64," + jpg.toString("base64") : "https://images.unsplash.com/photo-1?w=800&q=80",
}));
const DATA = { News: NEWS, Video: [{ _id: "v-1", title: "V", url: "https://youtu.be/x", thumb: "", addedAt: new Date() }], WorldCup: [{ year: 2022, type: "men", champion: "Argentina" }], Comment: [] };

function match(doc, q) {
  return Object.entries(q || {}).every(([k, v]) => {
    if (v && typeof v === "object" && "$nin" in v) return !v.$nin.includes(doc[k]);
    if (v && typeof v === "object" && "$gte" in v) return doc[k] >= v.$gte;
    if (v instanceof RegExp) return v.test(doc[k]);
    if (k === "$or") return v.some((s) => match(doc, s));
    return doc[k] === v;
  });
}
class Q {
  constructor(rows) { this.rows = rows; }
  select() { return this; } lean() { return this; }
  sort(s) { if (String(s).includes("publishedAt")) this.rows = [...this.rows].sort((a, b) => b.publishedAt - a.publishedAt); return this; }
  skip(n) { this.rows = this.rows.slice(n); return this; } limit(n) { this.rows = this.rows.slice(0, n); return this; }
  then(res, rej) { return Promise.resolve(this.rows.map((r) => ({ ...r }))).then(res, rej); }
}
function fakeModel(name) {
  const rows = () => DATA[name] || [];
  return {
    find: (q) => new Q(rows().filter((d) => match(d, q))),
    findOne: (q) => new Q(rows().filter((d) => match(d, q)).slice(0, 1)).then((r) => r[0] || null),
    findById: (id) => { const q = new Q(rows().filter((d) => d._id === id)); q.then = (res, rej) => Promise.resolve(q.rows[0] ? { ...q.rows[0] } : null).then(res, rej); return q; },
    countDocuments: async (q) => rows().filter((d) => match(d, q)).length,
    create: async (doc) => { const d = { _id: name[0].toLowerCase() + "-" + rows().length, ...doc }; (DATA[name] = rows()).push(d); return d; },
    updateOne: async (q, set) => { const d = rows().find((x) => match(x, q)); if (d) Object.assign(d, set); return {}; },
    aggregate: async (pipe) => {
      let r = rows().map((d) => ({ ...d }));
      for (const st of pipe) {
        if (st.$match) r = r.filter((d) => match(d, st.$match));
        if (st.$sort) r.sort((a, b) => (b.publishedAt || b.addedAt) - (a.publishedAt || a.addedAt));
        if (st.$skip) r = r.slice(st.$skip);
        if (st.$limit) r = r.slice(0, st.$limit);
        if (st.$project) r = r.map((d) => {
          const o = { _id: d._id };
          for (const [k, v] of Object.entries(st.$project)) {
            if (v === 1) { if (k in d) o[k] = d[k]; continue; }
            const field = JSON.stringify(v).match(/\["\$(\w+)"/)[1]; // the field inside $ifNull: ["$field", ""]
            const val = d[field] || "";
            o[k] = "$ne" in v ? val !== "" : /^data:/.test(val) ? "" : val;
          }
          return o;
        });
      }
      return r;
    },
  };
}
const models = path.join(__dirname, "..", "models");
for (const f of fs.readdirSync(models)) {
  const name = path.basename(f, ".js");
  if (name.startsWith("_")) continue;
  const file = require.resolve(path.join(models, f));
  require.cache[file] = { id: file, filename: file, loaded: true, exports: fakeModel(name) };
}

const fail = []; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fail.push(m); };

(async () => {
  const app = require("../app");
  const srv = app.listen(4111);
  const B = "http://127.0.0.1:4111";
  const get = async (p) => { const r = await fetch(B + p, { redirect: "manual" }); const buf = Buffer.from(await r.arrayBuffer()); return { r, buf, text: buf.toString("utf8") }; };

  const boot = await get("/api/bootstrap");
  const bj = JSON.parse(boot.text);
  ok(Object.keys(bj.data).sort().join() === "comments,news,videos,worldcups", "bootstrap keys: " + Object.keys(bj.data).join());
  ok(bj.data.news.length === 8 && bj.data.news.every((n) => !("body" in n)), "bootstrap news has no bodies");
  ok(bj.data.news.every((n) => String(n.excerpt || "").length > 0), "empty excerpt is filled from the body");
  ok(/s-maxage=60/.test(boot.r.headers.get("cache-control")), "bootstrap cache: " + boot.r.headers.get("cache-control"));
  if (jpg) ok(bj.data.news[0].cover === "/api/media/news/n-t0/cover", "base64 cover becomes a media URL");

  const one = await get("/api/news/n-t1");
  ok(one.r.status === 200 && JSON.parse(one.text).data.body, "article API returns the body");
  ok(/s-maxage=60/.test(one.r.headers.get("cache-control") || ""), "article API cache: " + one.r.headers.get("cache-control"));

  if (jpg) {
    const orig = await get("/api/media/news/n-t0/cover");
    const small = await get("/api/media/news/n-t0/cover?w=480");
    const bad = await get("/api/media/news/n-t0/cover?w=333");
    ok(small.r.headers.get("content-type") === "image/webp", "?w=480 is WebP");
    ok(small.buf.length < orig.buf.length / 2, `resized ${Math.round(orig.buf.length / 1024)} KB -> ${Math.round(small.buf.length / 1024)} KB`);
    ok(bad.r.headers.get("content-type") === "image/jpeg", "unknown width serves the original");
    const meta = await require("sharp")(small.buf).metadata();
    ok(meta.width === 480, "resized width " + meta.width);
    const big = await get("/api/media/news/n-t0/cover?w=1200");
    console.log("   1200px WebP:", Math.round(big.buf.length / 1024), "KB");
  }
  const ext = await get("/api/media/news/n-t1/cover?w=640");
  ok(ext.r.status === 302 && /w=640/.test(ext.r.headers.get("location")) && /auto=format/.test(ext.r.headers.get("location")), "Unsplash redirect is resized: " + ext.r.headers.get("location"));

  const home = await get("/");
  ok(/class="hero-card"/.test(home.text), "home SSR has the featured card");
  ok(/<link rel="preload" as="image"/.test(home.text), "home SSR preloads the featured image");
  ok((home.text.match(/<div class="thumb"><img /g) || []).length === 6, "home SSR cards have images");
  ok(/s-maxage=120/.test(home.r.headers.get("cache-control")), "html cache: " + home.r.headers.get("cache-control"));
  if (jpg) ok(home.text.includes("/api/media/news/n-t0/cover?w=640"), "featured image uses the resized URL");

  const slug = (await require("../utils/slug").getSlugMap()).byId["n-t1"];
  const art = await get("/news/" + slug);
  ok(art.r.status === 200 && /fetchpriority="high"/.test(art.text), "article SSR cover has fetchpriority");
  ok(/<link rel="preload" as="image"/.test(art.text), "article SSR preloads the cover");
  ok((art.text.match(/<div class="thumb"><img /g) || []).length === 6, "related cards have images");
  const ld = JSON.parse(art.text.match(/<script type="application\/ld\+json" id="tg-jsonld">([\s\S]*?)<\/script>/)[1].replace(/<\\\//g, "</"));
  ok(ld[0].dateModified >= ld[0].datePublished, "dateModified >= datePublished");
  ok(ld[0].author["@type"] === "Person" && ld[0].author.name === "Rehan" && /\/about#rehan$/.test(ld[0].author.url), "schema author is Person Rehan");
  ok(/By <a href="\/about#rehan" rel="author"><b>Rehan<\/b><\/a>, Editor/.test(art.text), "article byline: Rehan, Editor");
  ok(/<meta name="author" content="Rehan" \/>/.test(art.text), "author meta tag");

  const list = await get("/news");
  ok(list.r.status === 200 && (list.text.match(/<div class="thumb"><img /g) || []).length === 8, "news list SSR cards have images");

  // AdSense fixes: shared info pages, contact form, merged duplicates, hidden cover.
  const priv = await get("/privacy");
  ok(/Google Analytics 4/.test(priv.text) && /Last updated: 13 November 2026/.test(priv.text), "privacy page has GA section and a fixed date");
  const about = await get("/about");
  ok(/did not give permission/.test(about.text) && !/Player photographs are sourced/.test(about.text), "about page has the takedown note, old credit line gone");
  const contactPage = await get("/contact");
  ok(/id="contact-form"/.test(contactPage.text), "contact page has the form");
  const post = (body) => fetch(B + "/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const bad = await post({ name: "A", email: "nope", message: "short" });
  ok(bad.status === 400, "contact: invalid input is rejected (" + bad.status + ")");
  const bot = await post({ name: "Bot", email: "b@b.co", message: "spam spam spam", website: "x" });
  ok(bot.status === 200 && !(DATA.ContactMessage || []).some((m) => m.name === "Bot"), "contact: honeypot is dropped");
  const good = await post({ name: "Fan", email: "fan@example.com", topic: "Correction", message: "The score in the report is wrong." });
  ok(good.status === 503 && (DATA.ContactMessage || []).some((m) => m.name === "Fan"), "contact: saved; 503 because SMTP is not set locally (" + good.status + ")");
  const SLUG = require("../utils/slug");
  ok(SLUG.MERGED["n-s21ix27"] === "n-k7n4sqy" && SLUG.NO_COVER["n-97n42r2"], "merge and no-cover lists load");

  // Score fixes: feeds, 404 noindex, hub share image + schema, titles, related links.
  const rss = await get("/rss.xml");
  ok(rss.r.status === 200 && /<rss version="2.0"/.test(rss.text) && (rss.text.match(/<item>/g) || []).length === 8 && /<dc:creator>Rehan, Editor<\/dc:creator>/.test(rss.text), "rss.xml lists the articles");
  const nsm = await get("/news-sitemap.xml");
  ok(nsm.r.status === 200 && /<news:publication_date>/.test(nsm.text) && (nsm.text.match(/<url>/g) || []).length === 8, "news-sitemap.xml lists the last 48 hours");
  const nf = await get("/no-such-page");
  ok(nf.r.status === 404 && /<meta name="robots" content="noindex, follow" \/>/.test(nf.text) && !/og-default/.test(nf.text), "404 page is noindex and has no share image");
  const vids = await get("/videos");
  ok(/og:image" content="https:\/\/www.timegridfc.com\/assets\/img\/og-default.png"/.test(vids.text) && /"CollectionPage"/.test(vids.text), "videos hub: default share image + CollectionPage");
  ok(/<title>Football Videos &amp; Match Analysis — Time Grid FC<\/title>/.test(vids.text), "videos hub title");
  ok(/"ItemList"/.test(list.text), "news hub has ItemList schema");
  ok(/"AboutPage"/.test(about.text) && /"ContactPage"/.test(contactPage.text), "about/contact page schema");
  ok(/<title>Test Article Number 1 — Time Grid FC<\/title>/.test(art.text), "short headline keeps the brand suffix");
  const INFO = require("../../../assets/js/infopages.js");
  ok(INFO.pageTitle("x".repeat(70)) === "x".repeat(70), "long headline drops the brand suffix");
  ok((art.text.match(/<div class="thumb"><img /g) || []).length === 6, "article shows 6 related articles");
  ok(/width="960" height="480"/.test(art.text), "cover image has width/height");

  if (process.env.KEEP) { console.log("Server kept running on " + B); return; } // KEEP=1: look at it in a browser
  srv.close();
  console.log(fail.length ? `\n${fail.length} FAILED` : "\nALL PASSED");
  process.exit(fail.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
