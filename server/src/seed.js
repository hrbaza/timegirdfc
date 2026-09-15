require("dotenv").config();
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const { localDate, maskUri } = require("./utils/id");

const Country = require("./models/Country");
const Team = require("./models/Team");
const Player = require("./models/Player");
const League = require("./models/League");
const WorldCup = require("./models/WorldCup");
const Award = require("./models/Award");
const Fixture = require("./models/Fixture");
const News = require("./models/News");
const Transfer = require("./models/Transfer");
const Video = require("./models/Video");
const User = require("./models/User");
const Comment = require("./models/Comment");

// Load the SAME seed the frontend uses → single source of truth.
function loadBrowserSeed() {
  const p = path.resolve(__dirname, "../../assets/js/seed.js");
  const code = fs.readFileSync(p, "utf8");
  const sandbox = { window: {}, Date, Math, console };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  if (!sandbox.window.TG_SEED) throw new Error("Could not read TG_SEED from assets/js/seed.js");
  return sandbox.window.TG_SEED;
}

const withId = (arr) => arr.map(({ id, ...rest }) => ({ _id: id, ...rest }));

// Users & comments live in the frontend's store.js, not seed.js → defined here.
const seedUsers = [
  { _id: "u-admin", name: "Rehan (Admin)", email: "admin@timegridfc.com", password: "admin123", role: "Admin" },
  { _id: "u-editor", name: "Editor", email: "editor@timegridfc.com", password: "editor123", role: "Editor" },
  { _id: "u-fan", name: "Alex Fan", email: "fan@example.com", password: "password", role: "Visitor" },
];
const seedComments = [
  { postId: "n-1", userId: "u-fan", author: "Alex Fan", text: "What a game! Rodri was everywhere in midfield.", status: "approved" },
  { postId: "n-1", userId: "u-fan", author: "Alex Fan", text: "Arsenal will bounce back, still a long season.", status: "pending" },
  { postId: "n-2", userId: "u-fan", author: "Alex Fan", text: "Vini is unstoppable this year.", status: "approved" },
];

const MODELS = [Country, Team, Player, League, WorldCup, Award, Fixture, News, Transfer, Video, User, Comment];

async function wipe() {
  await Promise.all(MODELS.map((M) => M.deleteMany({})));
}

// Seed into the CURRENT mongoose connection (does not connect/disconnect).
async function seedDatabase() {
  const S = loadBrowserSeed();
  await wipe();

  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const fixtures = S.fixtures.map(({ id, ...rest }) => ({
    _id: id,
    ...rest, // keeps dayOffset so the UI can recompute dates relative to today
    date: localDate(new Date(midnight.getTime() + (rest.dayOffset || 0) * 86400000)),
  }));
  const countries = S.countries.map((c) => ({ _id: c.code, code: c.code, name: c.name, flag: c.flag }));

  await Country.insertMany(countries);
  await Team.insertMany(withId(S.teams));
  await League.insertMany(withId(S.leagues));
  await Player.insertMany(withId(S.players));
  await WorldCup.insertMany(S.worldcups);
  await Award.insertMany(withId(S.awards));
  await Fixture.insertMany(fixtures);
  await News.insertMany(withId(S.news));
  await Transfer.insertMany(withId(S.transfers));
  await Video.insertMany(withId(S.videos));
  await User.create(seedUsers); // .create() → runs password-hash hook
  await Comment.insertMany(seedComments);

  const counts = {};
  for (const M of MODELS) counts[M.modelName] = await M.countDocuments();
  return counts;
}

async function runCLI() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/timegridfc";
  await connectDB(uri);
  console.log("✅ Connected:", maskUri(uri));

  if (process.argv.includes("--destroy")) {
    await wipe();
    console.log("🗑️  All collections cleared.");
  } else {
    const counts = await seedDatabase();
    console.log("🌱 Seeded:", counts);
    console.log("\n🔐 Logins:");
    console.log("   Admin  → admin@timegridfc.com / admin123");
    console.log("   Editor → editor@timegridfc.com / editor123");
    console.log("   Fan    → fan@example.com / password");
  }
  await mongoose.disconnect();
  console.log("\n✅ Done.");
}

module.exports = { seedDatabase, wipe };

if (require.main === module) {
  runCLI().catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
}
