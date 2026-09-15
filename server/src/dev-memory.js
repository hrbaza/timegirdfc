/* Run the FULL stack (API + frontend) against a throwaway in-memory MongoDB.
   Great for demos / trying it out with zero MongoDB install.
   Data resets every restart. Run: npm run dev:memory
   For real persistence use `npm run seed` + `npm start` with a real MONGO_URI. */
require("dotenv").config();
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { connectDB } = require("./config/db");
const { seedDatabase } = require("./seed");

(async () => {
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "dev-memory-secret";
  if (process.env.CLIENT_DIR === undefined) process.env.CLIENT_DIR = ".."; // serve the frontend too

  console.log("⏳ Starting in-memory MongoDB…");
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri("timegridfc");
  await connectDB(uri);
  const counts = await seedDatabase();
  console.log("🌱 Seeded in-memory DB:", counts);

  const app = require("./app");
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`\n🚀 Full stack on http://localhost:${PORT}`);
    console.log(`   Frontend → http://localhost:${PORT}`);
    console.log(`   API      → http://localhost:${PORT}/api/health`);
    console.log(`   (in-memory data resets on restart)`);
  });

  const stop = async () => { try { await mongoose.disconnect(); await mongod.stop(); } catch (e) {} process.exit(0); };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
})().catch((e) => { console.error("dev:memory failed:", e); process.exit(1); });
