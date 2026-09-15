require("dotenv").config();
const app = require("./app");
const { connectDB } = require("./config/db");

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/timegridfc";

(async () => {
  try {
    await connectDB(MONGO_URI);
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => {
      console.log(`🚀 Time Grid FC API on http://localhost:${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/api/health`);
      if (process.env.CLIENT_DIR) console.log(`   Frontend served at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start:", err.message);
    console.error("   Is MongoDB running, or is MONGO_URI correct?");
    process.exit(1);
  }
})();

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});
