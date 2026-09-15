# 🚀 Deploying Time Grid FC to Vercel

This project is ready to deploy to Vercel as **static frontend + a serverless API**
backed by your MongoDB Atlas cluster.

```
/index.html, /admin.html, /assets, /robots.txt, /sitemap.xml, /ads.txt   → served as static files
/api/*                                                                    → serverless function (api/index.js → Express → MongoDB Atlas)
```

If the API is ever unreachable, the frontend automatically falls back to its
offline (localStorage) mode, so the site stays usable.

---

## Before you start
- A **Vercel account** (free): https://vercel.com
- Your **MongoDB Atlas** cluster (already set up).
- In Atlas → **Network Access**, make sure **`0.0.0.0/0` (Allow from anywhere)** is added — Vercel's serverless IPs are dynamic. *(You already did this.)*

---

## Option A — Deploy with the Vercel CLI (quickest)
From the project folder (`C:\Users\Hamza\timegrid`):

```bash
npm i -g vercel
vercel login
vercel            # first run: creates the project (accept defaults)
```

Then add your environment variables and deploy to production:

```bash
vercel env add MONGO_URI production
vercel env add JWT_SECRET production
vercel --prod
```

- **MONGO_URI** → your Atlas connection string (the one in `server/.env`).
- **JWT_SECRET** → the long random string from `server/.env`.
- (Optional) **JWT_EXPIRES_IN** → `7d`.

> Do **not** set `CLIENT_DIR` on Vercel — leaving it unset keeps the function API-only (the frontend is served by Vercel's static hosting).

---

## Option B — Deploy from GitHub (dashboard)
1. Push this folder to a new GitHub repository. `.gitignore` already excludes `node_modules` and `.env`, so your secrets stay private.
2. On Vercel: **Add New → Project → Import** your repo.
3. Framework preset: **Other** (no build command needed).
4. **Settings → Environment Variables**, add:
   - `MONGO_URI` = your Atlas connection string
   - `JWT_SECRET` = your secret
   - `JWT_EXPIRES_IN` = `7d` (optional)
5. Click **Deploy**.

---

## After it's live (`https://your-app.vercel.app`)
1. **Test the API:** open `https://your-app.vercel.app/api/health` → should return `{ "status": "success", ... }`.
2. **Test the site:** open the domain — the browser console logs `data mode: api (MongoDB backend)` when connected.
3. **Admin:** `https://your-app.vercel.app/admin` → log in with `admin@timegridfc.com` / `admin123`. **Change these demo passwords** (via the Users module) before promoting the site.
4. **Update SEO files** with your real domain:
   - `robots.txt` and `sitemap.xml` → replace `YOUR_DOMAIN` with your Vercel/custom domain.
5. **Custom domain (recommended for AdSense):** Vercel → Project → **Domains** → add your domain (e.g. `timegridfc.com`). AdSense strongly prefers a real top-level domain over a `*.vercel.app` subdomain.

---

## For Google AdSense (after deploy)
1. Apply at https://adsense.google.com with your live domain.
2. Once approved, paste the AdSense script into `index.html` (there's a placeholder comment in `<head>`), and add your `pub-id` line to `ads.txt`.
3. Keep publishing original articles from the admin panel — more quality content improves approval odds.

> ⚠️ **Crawlability note:** this is a client-rendered single-page app using hash
> routes (`#/...`). Google can render JavaScript, but for the strongest SEO and
> AdSense review you may later want server-side rendering / prerendering (e.g.
> migrating the frontend to Next.js). The API and content model already support it.

---

## Notes
- The seed data already lives in your Atlas cluster, so the deployed site shows real content immediately.
- The serverless function reuses its MongoDB connection between requests (warm starts).
- Local development is unchanged: `cd server && npm run dev:memory` (or `npm start` with `.env`).
