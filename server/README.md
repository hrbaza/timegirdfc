# ⚽ Time Grid FC — Backend API

REST API for the Time Grid FC website. **Node.js + Express + MongoDB (Mongoose)**
with JWT auth and bcrypt password hashing — the three-tier architecture from the
SRS (§5). It stores every entity from the SRS data model (§6) in MongoDB.

---

## ▶️ Run

### Option A — zero setup (in-memory MongoDB, great for trying it)
```bash
cd server
npm install
npm run dev:memory
```
Opens the **full stack** on <http://localhost:4000> — API **and** the frontend,
backed by a throwaway in-memory MongoDB (data resets on restart).

### Option B — real MongoDB (persistent)
1. Install MongoDB locally **or** create a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.
2. Configure env:
   ```bash
   cd server
   npm install
   cp .env.example .env      # then edit MONGO_URI + JWT_SECRET
   ```
3. Seed the database, then start:
   ```bash
   npm run seed              # loads all football data + demo users into MongoDB
   npm start                 # http://localhost:4000
   ```
   `npm run seed:destroy` empties all collections.

The frontend auto-detects the API: when it's served from (or can reach) the
backend it uses MongoDB; otherwise it falls back to the offline localStorage demo.

---

## 🔐 Demo accounts (created by the seed)

| Role    | Email                    | Password    |
|---------|--------------------------|-------------|
| Admin   | `admin@timegridfc.com`   | `admin123`  |
| Editor  | `editor@timegridfc.com`  | `editor123` |
| Visitor | `fan@example.com`        | `password`  |

Auth is **JWT** (`Authorization: Bearer <token>`). Passwords are hashed with
**bcrypt** and never returned by the API.

---

## 📡 API reference (base: `/api`)

Public = no auth · Staff = Admin/Editor token · Admin = Admin token only.

### Auth
| Method | Path | Access | Body |
|--------|------|--------|------|
| POST | `/auth/register` | Public | `{name,email,password}` → token (role Visitor) |
| POST | `/auth/login` | Public | `{email,password}` → token |
| POST | `/auth/admin/login` | Public | `{email,password}` → token (must be Admin/Editor) |
| GET  | `/auth/me` | Token | current user |

### Content & data resources
Each of these supports: `GET /` (list), `GET /:id` (one), `POST /` (create, staff),
`PUT|PATCH /:id` (update, staff), `DELETE /:id` (delete, staff).

`teams` · `countries` · `leagues` · `worldcups` · `awards` · `fixtures` · `transfers` · `videos`

List query params: `?page`, `?limit`, `?sort=-field`, `?fields=a,b`, plus equality
filters e.g. `/fixtures?status=live`, `/worldcups?type=men`.

### Players (extra routes)
| Method | Path | Access | Notes |
|--------|------|--------|-------|
| GET | `/players` | Public | list (`?country=EN`, `?pos=Forward`) |
| GET | `/players/:id` | Public | player **+ derived `honours[]`** (cross-linked from awards, FR-4↔FR-9) |
| GET | `/players/country/:code` | Public | FR-4 players-by-country |
| GET | `/players/countries/summary` | Public | country → player counts |
| POST/PUT/DELETE | … | Staff | CRUD |

### News (FR-2)
| Method | Path | Access | Notes |
|--------|------|--------|-------|
| GET | `/news` | Public | **published only**; `?category=`, `?page=`, `?limit=` |
| GET | `/news/:id` | Public | draft hidden unless staff token supplied |
| GET | `/news/manage` | Staff | everything incl. drafts |
| POST/PUT/DELETE | … | Staff | CRUD (auto slug) |

### Comments (FR-11)
| Method | Path | Access | Notes |
|--------|------|--------|-------|
| GET | `/comments/post/:postId` | Public | approved; staff+`?all=true` sees pending/flagged |
| POST | `/comments` | Signed-in user | `{postId,text}` |
| GET | `/comments` | Staff | moderation list (`?status=pending`) |
| PATCH | `/comments/:id/status` | Staff | `{status: approved\|pending\|flagged}` |
| DELETE | `/comments/:id` | Staff | remove |

### Users (FR-14)
`GET/POST/PUT/DELETE /users` — **Admin only**.

### Utility
`GET /health` · `GET /search?q=` (FR-12 grouped) · `GET /bootstrap` (all public data in one payload — used by the SPA cache).

---

## 🧪 Tests

```bash
npm run smoke
```
Spins up an in-memory MongoDB, seeds it, boots the real app, and asserts the key
flows: health, bootstrap, players-by-country, honours cross-link, published-only
news, draft hiding, admin login, unauthorized-write rejection, full news CRUD,
visitor register + comment, role-gated moderation, password never leaking, search,
and World Cup listing. (18 checks.)

---

## 🗂️ Structure

```
server/src/
  config/db.js            Mongoose connection
  models/                 User, Country, Team, Player, League, WorldCup,
                          Award, Fixture, News, Transfer, Video, Comment
  middleware/             auth (JWT + roles), error handler, validation
  controllers/            auth, players, news, comments, search/bootstrap,
                          generic CRUD factory
  routes/                 resource factory + per-entity routers
  seed.js                 loads ../../assets/js/seed.js (single source of truth)
  dev-memory.js           full stack on in-memory MongoDB
  tests/smoke.js          end-to-end smoke test
  app.js / server.js      Express app + entry point
```

## 🔒 Security (SRS §7.2)
bcrypt password hashing · JWT auth with per-route authorization · role-based access
(Visitor/Editor/Admin) · `express-mongo-sanitize` (NoSQL-injection guard) · `helmet`
headers · rate limiting on auth · CORS allow-list · input validation. Use HTTPS and
a strong `JWT_SECRET` in production.
