# 🎬 Watch Tracker

Personal site for tracking, rating, and getting suggestions for movies and TV shows.

- **Top Lists** — the IMDb top 100 movies and top 20 shows as a poster-grid checklist
- **Log** — search any movie or show (TMDB) and log it with a ½–5 star rating; TV is rated per season, with rewatch tracking
- **Suggestions** — unwatched classics ranked by your genre taste, plus "because you liked X" picks seeded from your 4★+ ratings
- **Watchlist** — queue things up, with streaming-provider availability
- **History** — a watch diary grouped by month

## Stack

Next.js (App Router) · Drizzle ORM · libsql/SQLite (Turso in production) · TMDB API · Tailwind. Multi-user: username+password accounts (each person gets their own watches, ratings, watchlist, and suggestions), a read-only guest view of the top lists, and an in-app `/admin` page for managing accounts.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in TMDB_API_TOKEN and AUTH_SECRET
npm run db:push              # create tables
npm run snapshot             # seed the top lists (downloads ~230 MB of IMDb data)
npx tsx scripts/create-user.ts --admin <name> <password>   # bootstrap the admin
npm run dev
```

`AUTH_SECRET` signs session cookies — generate one with `openssl rand -hex 32`.
The admin account created above can add everyone else from the `/admin` page.

`TMDB_API_TOKEN` is the **API Read Access Token** from themoviedb.org → Settings → API.

### Top-list snapshots

IMDb blocks scraping of its chart pages, so `npm run snapshot` computes the charts
from IMDb's official daily datasets (datasets.imdbws.com) using the published
Top 250 weighted-rating formula, then resolves titles via TMDB. Re-run it whenever
you want fresh rankings; it replaces the lists but never touches your watch data.

## Deploying (Vercel + Turso)

1. Push this repo to GitHub.
2. Create a Turso database (`turso db create watch-tracker` or the dashboard);
   note the `libsql://…` URL and an auth token.
3. Point the schema, seed, and admin bootstrap at production:
   ```bash
   DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… npm run db:push
   DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… npm run snapshot
   DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… npx tsx scripts/create-user.ts --admin <name> <password>
   ```
4. Import the repo on Vercel and set env vars: `DATABASE_URL`,
   `DATABASE_AUTH_TOKEN`, `TMDB_API_TOKEN`, `AUTH_SECRET`, `WATCH_REGION`.
5. Deploy. Everything except the top-lists home page and `/login` requires an
   account; accounts are managed on `/admin`.
