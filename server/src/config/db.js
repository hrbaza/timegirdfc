const mongoose = require("mongoose");

async function connectDB(uri) {
  mongoose.set("strictQuery", true);
  // Fail fast instead of buffering queries for 10s when the DB is unreachable —
  // keeps the site responsive (falls back to offline mode quickly) on serverless.
  mongoose.set("bufferCommands", false);
  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000, // within the serverless function time budget
  });
  return conn;
}

module.exports = { connectDB };
