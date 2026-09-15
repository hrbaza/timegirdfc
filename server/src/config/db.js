const mongoose = require("mongoose");

async function connectDB(uri) {
  mongoose.set("strictQuery", true);
  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30000, // tolerate brief Atlas primary elections
  });
  return conn;
}

module.exports = { connectDB };
