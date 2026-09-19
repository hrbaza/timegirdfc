/* Vercel serverless entry for the Time Grid FC API.
   Runs the Express app (server/src/app.js) with a cached MongoDB connection so
   warm invocations reuse the same connection. Only /api/* is routed here
   (see vercel.json); the frontend is served as static files by Vercel.
   Env vars to set in Vercel: MONGO_URI, JWT_SECRET (and optionally JWT_EXPIRES_IN). */
require("dotenv").config();
// Serve the frontend (with SSR) from the same function so page requests get
// per-page meta + prerendered article HTML. Assets/robots/sitemap stay static
// (see vercel.json). CLIENT_DIR="../.." resolves to the repo root from server/src.
if (process.env.CLIENT_DIR === undefined) process.env.CLIENT_DIR = "..";
const mongoose = require("mongoose");
const app = require("../server/src/app");
const { connectDB } = require("../server/src/config/db");

let connPromise = null;
async function ensureDB() {
  if (mongoose.connection.readyState === 1) return;          // already connected
  if (!connPromise) connPromise = connectDB(process.env.MONGO_URI).catch((e) => { connPromise = null; throw e; });
  await connPromise;
}

module.exports = async (req, res) => {
  try {
    await ensureDB();
  } catch (e) {
    // If the DB is unreachable, still let Express respond (data routes will 5xx).
    // The frontend detects this and falls back to offline mode, so the site stays usable.
    console.error("DB connection error:", e.message);
  }
  return app(req, res);
};
