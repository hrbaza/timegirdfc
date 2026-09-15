/* End-to-end smoke test: spins up an in-memory MongoDB, seeds it, boots the
   real Express app, and exercises the key endpoints. No local Mongo needed.
   Run: npm run smoke  */
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
delete process.env.CLIENT_DIR; // API-only for the test

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { connectDB } = require("../config/db");
const { seedDatabase } = require("../seed");

let passed = 0, failed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log("  ✓", name); }
  else { failed++; console.log("  ✗", name, extra != null ? "→ " + JSON.stringify(extra) : ""); }
}

async function main() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await connectDB(uri);
  const counts = await seedDatabase();
  console.log("Seeded:", counts, "\n");

  const app = require("../app");
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const j = async (res) => ({ status: res.status, body: await res.json().catch(() => ({})) });

  try {
    // health
    let r = await j(await fetch(`${base}/api/health`));
    check("GET /api/health", r.status === 200 && r.body.status === "success");

    // bootstrap
    r = await j(await fetch(`${base}/api/bootstrap`));
    check("GET /api/bootstrap returns collections", r.status === 200 && r.body.data.players.length > 0 && r.body.data.teams.length > 0, { players: r.body.data && r.body.data.players && r.body.data.players.length });

    // players by country + honours cross-link
    r = await j(await fetch(`${base}/api/players/country/AR`));
    check("GET /api/players/country/AR", r.status === 200 && r.body.results >= 1);
    r = await j(await fetch(`${base}/api/players/p-messi`));
    check("GET /api/players/p-messi has honours[]", r.status === 200 && Array.isArray(r.body.data.honours) && r.body.data.honours.length > 0, { honours: r.body.data && r.body.data.honours });

    // published news + drafts hidden
    r = await j(await fetch(`${base}/api/news`));
    const publishedCount = r.body.total;
    check("GET /api/news lists published only", r.status === 200 && r.body.data.every((n) => n.status === "published"));
    r = await j(await fetch(`${base}/api/news/n-7`)); // n-7 is a draft in seed
    check("GET draft as public → 404", r.status === 404);

    // auth: admin login
    r = await j(await fetch(`${base}/api/auth/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@timegridfc.com", password: "admin123" }) }));
    check("POST /api/auth/admin/login", r.status === 200 && !!r.body.token, { status: r.status, msg: r.body.message });
    const adminToken = r.body.token;

    // non-staff cannot create
    r = await j(await fetch(`${base}/api/news`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Nope" }) }));
    check("POST /api/news without token → 401", r.status === 401);

    // admin can create news
    r = await j(await fetch(`${base}/api/news`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ title: "Smoke Test Post", category: "Match Analysis", status: "published", excerpt: "x" }) }));
    check("POST /api/news as admin → 201", r.status === 201 && r.body.data.slug, { status: r.status, msg: r.body.message });
    const newPostId = r.body.data.id;

    r = await j(await fetch(`${base}/api/news`));
    check("news count incremented", r.body.total === publishedCount + 1, { before: publishedCount, after: r.body.total });

    // admin can update + delete
    r = await j(await fetch(`${base}/api/news/${newPostId}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ title: "Smoke Test Post (edited)" }) }));
    check("PUT /api/news/:id", r.status === 200 && r.body.data.title.includes("edited"));
    let del = await fetch(`${base}/api/news/${newPostId}`, { method: "DELETE", headers: { Authorization: `Bearer ${adminToken}` } });
    check("DELETE /api/news/:id → 204", del.status === 204);

    // register a visitor + post a comment
    r = await j(await fetch(`${base}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Test Fan", email: "test.fan@example.com", password: "secret1" }) }));
    check("POST /api/auth/register → 201 + Visitor role", r.status === 201 && r.body.data.role === "Visitor", { status: r.status, msg: r.body.message });
    const fanToken = r.body.token;

    r = await j(await fetch(`${base}/api/comments`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${fanToken}` }, body: JSON.stringify({ postId: "n-1", text: "Great analysis!" }) }));
    check("POST /api/comments as user → 201", r.status === 201 && r.body.data.author === "Test Fan", { status: r.status, msg: r.body.message });

    // visitor CANNOT moderate
    r = await j(await fetch(`${base}/api/comments`, { headers: { Authorization: `Bearer ${fanToken}` } }));
    check("visitor GET /api/comments (moderation) → 403", r.status === 403);

    // password never leaks
    r = await j(await fetch(`${base}/api/users`, { headers: { Authorization: `Bearer ${adminToken}` } }));
    check("GET /api/users (admin) hides password", r.status === 200 && r.body.data.every((u) => !("password" in u)), { sample: r.body.data && r.body.data[0] });

    // search
    r = await j(await fetch(`${base}/api/search?q=messi`));
    check("GET /api/search?q=messi", r.status === 200 && r.body.data.players.length > 0);

    // world cup all editions
    r = await j(await fetch(`${base}/api/worldcups?limit=100`));
    check("GET /api/worldcups", r.status === 200 && r.body.total >= 30);
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongod.stop();
  }

  console.log(`\n${failed === 0 ? "✅" : "❌"} Smoke test: ${passed} passed, ${failed} failed.`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error("Smoke test crashed:", e); process.exit(1); });
