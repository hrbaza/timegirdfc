const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");

const apiRouter = require("./routes");
const { notFound, errorHandler } = require("./middleware/error");

const app = express();
// Behind Vercel's proxy: take the visitor's IP from X-Forwarded-For, so rate
// limits count each visitor separately instead of the proxy as one client.
app.set("trust proxy", 1);

// --- Canonical host: non-www → www (301), EXCEPT /ads.txt which must return
// 200 directly on both hosts for the AdSense crawler. (Only takes effect if the
// non-www domain is set to "serve" in Vercel rather than platform-redirect.) ---
app.use((req, res, next) => {
  const host = (req.headers.host || "").toLowerCase();
  if (host === "timegridfc.com" && req.path !== "/ads.txt") {
    return res.redirect(301, "https://www.timegridfc.com" + (req.originalUrl || req.url || "/"));
  }
  next();
});

// --- Security & parsing ---
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, hsts: { maxAge: 31536000, includeSubDomains: true } }));
// Turn off device features the site never uses. Ad-related features (topics,
// attribution reporting, ad auctions) are left alone so AdSense keeps working.
app.use((req, res, next) => { res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()"); next(); });

const origins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      // allow same-origin/no-origin (curl, server-to-server) and whitelisted origins
      if (!origin || origins.length === 0 || origins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
  })
);

app.use(express.json({ limit: "6mb" })); // roomy for inline image data URLs from the admin panel
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize()); // strip $ / . operators → prevents NoSQL injection (SRS §7.2)
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

// --- API ---
app.use("/api", apiRouter);
app.all("/api/*", notFound); // JSON 404 for unknown API routes

// --- Optionally serve the frontend from the same origin (no CORS needed) ---
const clientDirEnv = process.env.CLIENT_DIR;
if (clientDirEnv) {
  const clientDir = path.resolve(__dirname, "..", clientDirEnv);
  // Only expose the frontend's own files — never the server/ folder or .env.
  app.use("/assets", express.static(path.join(clientDir, "assets")));
  // Dynamic sitemap: built from the DB so new articles appear automatically.
  app.get("/sitemap.xml", async (req, res) => {
    const sm = require("./sitemap");
    let xml;
    try { xml = await sm.buildSitemap(); }
    catch (e) { console.error("sitemap error:", e.message); xml = sm.staticSitemapXml(); }
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
    res.send(xml);
  });
  // Google News sitemap (last 48 hours) and RSS feed (latest 30 articles).
  app.get(["/news-sitemap.xml", "/rss.xml"], async (req, res) => {
    try {
      const feeds = require("./feeds");
      const rss = req.path === "/rss.xml";
      const xml = rss ? await feeds.buildRss() : await feeds.buildNewsSitemap();
      res.set("Content-Type", rss ? "application/rss+xml; charset=utf-8" : "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=0, s-maxage=600, stale-while-revalidate=3600");
      res.send(xml);
    } catch (e) {
      console.error("feed error:", e.message);
      res.status(503).set("Retry-After", "120").type("text/plain").send("Feed temporarily unavailable.");
    }
  });
  // llms.txt / llms-full.txt — structured content for AI answer engines.
  app.get(["/llms.txt", "/llms-full.txt"], async (req, res) => {
    try {
      const llms = require("./llms");
      const txt = req.path === "/llms-full.txt" ? await llms.buildLlmsFull() : await llms.buildLlms();
      res.set("Content-Type", "text/plain; charset=utf-8");
      res.set("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
      res.send(txt);
    } catch (e) {
      console.error("llms error:", e.message);
      res.status(500).type("text/plain").send("# Time Grid FC\n");
    }
  });
  // Other SEO / AdSense files served from the site root.
  app.get(["/robots.txt", "/ads.txt"], (req, res) => res.sendFile(path.join(clientDir, req.path.slice(1))));
  // Admin panel lives on its own protected URL.
  app.get(["/admin", "/admin.html"], (req, res) => res.sendFile(path.join(clientDir, "admin.html")));
  // Every other route → server-render the page's <head> meta (+ article content)
  // for SEO, then the client SPA hydrates. Falls back to the raw shell on error.
  const { renderPage } = require("./ssr");
  app.get("*", async (req, res) => {
    try {
      const { html, status, redirect } = await renderPage(req, clientDir);
      if (redirect) {
        // Old /news/<id> URL → its permanent /news/<title-slug> URL.
        res.set("Cache-Control", "public, max-age=0, s-maxage=3600");
        return res.redirect(301, redirect);
      }
      res.set("Content-Type", "text/html; charset=utf-8");
      // Let Vercel's CDN cache the rendered HTML briefly (fast) but stay fresh so
      // new/edited posts show quickly. The client also re-hydrates from the API.
      // A genuine 404 is returned as a real 404 (never a Soft 404) and not cached.
      if (status === 404) res.set("Cache-Control", "no-store");
      // The CDN refreshes it in the background after 2 minutes, so visitors
      // (and Googlebot) almost never wait for the function and the database.
      else res.set("Cache-Control", "public, max-age=0, s-maxage=120, stale-while-revalidate=86400");
      res.status(status || 200).send(html);
    } catch (e) {
      console.error("SSR error:", e.message);
      // Last-resort: serve the shell so the SPA still boots (client renders all).
      res.set("Content-Type", "text/html; charset=utf-8");
      res.send(
        '<!DOCTYPE html><html lang="en" data-theme="dark"><head><meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
        '<title>Time Grid FC — Football News, Analysis & Videos</title>' +
        '<link rel="stylesheet" href="/assets/css/styles.css"></head><body>' +
        '<header id="tg-header"></header>' +
        '<div id="tg-search-overlay" class="search-overlay" hidden></div>' +
        '<main id="tg-app" tabindex="-1"></main><footer id="tg-footer"></footer>' +
        '<div id="tg-toast" aria-live="polite"></div>' +
        ["seed", "api", "store", "ui", "pages", "admin", "app"]
          .map((f) => `<script src="/assets/js/${f}.js"></script>`).join("") +
        "</body></html>"
      );
    }
  });
} else {
  app.get("/", (req, res) => res.json({ status: "success", message: "Time Grid FC API. See /api/health" }));
  app.use(notFound);
}

app.use(errorHandler);

module.exports = app;
