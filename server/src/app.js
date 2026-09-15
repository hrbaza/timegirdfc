const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");

const apiRouter = require("./routes");
const { notFound, errorHandler } = require("./middleware/error");

const app = express();

// --- Security & parsing ---
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

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
  // SEO / AdSense files served from the site root.
  app.get(["/robots.txt", "/sitemap.xml", "/ads.txt"], (req, res) => res.sendFile(path.join(clientDir, req.path.slice(1))));
  // Admin panel lives on its own protected URL.
  app.get(["/admin", "/admin.html"], (req, res) => res.sendFile(path.join(clientDir, "admin.html")));
  app.get("*", (req, res) => res.sendFile(path.join(clientDir, "index.html")));
} else {
  app.get("/", (req, res) => res.json({ status: "success", message: "Time Grid FC API. See /api/health" }));
  app.use(notFound);
}

app.use(errorHandler);

module.exports = app;
