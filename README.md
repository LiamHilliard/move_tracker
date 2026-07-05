# 🎬 Watch Tracker

Personal site for tracking, rating, and getting suggestions for movies and TV shows.

- **Top Lists** — the IMDb top 100 movies and top 20 shows as a poster-grid checklist
- **Log** — search any movie or show (TMDB) and log it with a ½–5 star rating; TV is rated per season, with rewatch tracking
- **Suggestions** — unwatched classics ranked by your genre taste, plus "because you liked X" picks seeded from your 4★+ ratings
- **Watchlist** — queue things up, with streaming-provider availability
- **History** — a watch diary grouped by month

## Stack

Next.js (App Router) · Drizzle ORM · libsql/SQLite (Turso in production) · TMDB API · Tailwind. One shared passcode gates the whole site (middleware).

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in TMDB_API_TOKEN (and PASSCODE if wanted)
npm run db:push              # create tables
npm run snapshot             # seed the top lists (downloads ~230 MB of IMDb data)
npm run dev
```

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
3. Point the schema and seed at production:
   ```bash
   DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… npm run db:push
   DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… npm run snapshot
   ```
4. Import the repo on Vercel and set env vars: `DATABASE_URL`,
   `DATABASE_AUTH_TOKEN`, `TMDB_API_TOKEN`, `PASSCODE`, `WATCH_REGION`.
5. Deploy. The passcode gate is active whenever `PASSCODE` is non-empty.
