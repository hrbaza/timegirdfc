# ⚽ Time Grid FC — Football News, Stats & Community

The official companion website for the **Time Grid FC** YouTube channel, built to the
`TimeGridFC_Website_SRS` (v1.0). A football content hub: daily news, a searchable
player & club database organised by country, fixtures, league & World Cup history,
individual awards, transfers, videos, user comments, and a full Admin Panel / CMS.

---

## ▶️ How to run

**Option A — full stack with MongoDB (recommended)**
Runs the Node/Express API + the frontend together; all data lives in MongoDB.
```bash
cd server
npm install
npm run dev:memory      # zero-setup: uses a throwaway in-memory MongoDB
```
Open <http://localhost:4000>. For **persistent** MongoDB (local install or Atlas),
see [`server/README.md`](server/README.md): `cp .env.example .env`, set `MONGO_URI`,
then `npm run seed && npm start`.

**Option B — frontend only, offline (no backend)**
Double-click `index.html`, or `python -m http.server 8777`. The app auto-falls back
to an in-browser `localStorage` demo — everything still works offline.

> The frontend **auto-detects** the backend: if the API is reachable it reads/writes
> **MongoDB**; otherwise it uses the offline demo store. You can tell which mode
> you're in from the console log and the badge on the Admin dashboard.

In the Claude Code desktop app you can also press **Run** on a launch config in
`.claude/launch.json` (full stack, or frontend-only).

---

## 🔐 Demo accounts

| Role    | Email                     | Password    | Use                                   |
|---------|---------------------------|-------------|---------------------------------------|
| Admin   | `admin@timegridfc.com`    | `admin123`  | Full Admin Panel (all modules + Users)|
| Editor  | `editor@timegridfc.com`   | `editor123` | Admin Panel content (no Users module) |
| Visitor | `fan@example.com`         | `password`  | Sign in on the public site to comment |

- **Public sign in:** top-right **Sign In** → needed to post comments (FR-11).
- **Admin Panel:** its **own separate URL** — `http://localhost:4000/admin` (or open `admin.html`). Footer → *Admin Panel* also links there. Separate secure login.

> The Admin dashboard has a **"Reset all data to defaults"** button to restore the
> seeded demo content at any time.

---

## 🗺️ Feature map (SRS → where to find it)

| SRS | Feature | Route |
|-----|---------|-------|
| FR-1  | Homepage, sticky nav, ticker, search, theme toggle, sign-in | `#/` |
| FR-2  | News & Blog (categories, pagination, article + related) | `#/news` |
| FR-3  | Videos — YouTube redirect (opens channel in new tab) | `#/videos` |
| FR-4  | Players database — choose country → search → profile (career, stats, honours) | `#/players` |
| FR-5  | Teams & Clubs — by league, squad, honours | `#/teams` |
| FR-6  | Match schedule / fixtures (today, upcoming, results) | `#/schedule` |
| FR-7  | Leagues & competitions history + all-time tables | `#/leagues` |
| FR-8  | World Cup history — Men's & Women's + all-time winners | `#/worldcup` |
| FR-9  | Individual awards (Ballon d'Or, etc.) cross-linked to players | `#/awards` |
| FR-10 | Transfer news feed (filterable) | `#/transfers` |
| FR-11 | User accounts & comments (comment gated behind sign-in) | `#/signup`, article pages |
| FR-12 | Global search (players, teams, news, competitions) | search icon / press `/` |
| FR-13 | Light / Dark theme toggle (persists) | theme icon in nav |
| FR-14 | Admin Panel / CMS — dashboard + full CRUD (separate protected URL) | `/admin` (`admin.html`) |

Design requirements (SRS §8): pitch-inspired palette, football iconography, a custom
**animated football cursor** (spins/kicks on click), card-based layout, smooth hover &
reveal animations, and two fully-designed themes.

---

## 🏗️ Architecture (three-tier, per SRS §5)

```
Frontend (this folder)                 Backend (server/)              Database
──────────────────────                 ─────────────────             ────────
index.html  app shell                  Node.js + Express             MongoDB
assets/css/styles.css  design system   Mongoose models               (Mongoose)
assets/js/                             JWT auth + bcrypt
  seed.js    initial football data     REST API under /api
  api.js     REST client (fetch)  ───▶ controllers + routes  ───▶  players, teams,
  store.js   data layer (API cache      middleware (auth, CORS,      leagues, news,
             OR localStorage fallback)  helmet, sanitize, rate-limit) comments, users…
  ui.js      nav/footer/cursor/theme    seed.js  (loads THIS
  pages.js   public page renderers               folder's seed.js)
  admin.js   Admin Panel / CMS          → see server/README.md
  app.js     hash router + bootstrap
```

**Data flow.** `store.js` keeps an in-memory cache for fast, synchronous rendering.
On boot it probes the backend: reachable → **API mode** (reads/writes go to MongoDB
via `api.js`); unreachable → **local mode** (offline `localStorage` demo). The UI code
is identical in both modes. `assets/js/seed.js` is the single source of truth for
initial data — the backend's `npm run seed` loads that very file into MongoDB.

The backend implements the SRS stack (Node/Express + a relational-or-document DB;
we chose **MongoDB**, which the SRS explicitly permits as an equivalent substitute).
Full API docs, security notes, and tests are in **[`server/README.md`](server/README.md)**.

**Remaining scope note vs. the production SRS:**
- **SEO** meta/titles update per route client-side; true organic SEO (SRS §7.4) would
  add server-side rendering (e.g. Next.js), a generated `sitemap.xml`/`robots.txt`, and
  schema.org markup. Everything else in the SRS (incl. server-side **bcrypt** password
  hashing, JWT auth, and MongoDB persistence, §7.2) is implemented.
- **YouTube Data API** auto-fetch (FR-3) is represented by manual title/thumbnail fields.
- **Country flags** load from flagcdn.com with an offline code-badge fallback.
