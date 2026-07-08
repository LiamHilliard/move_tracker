/**
 * Snapshot script: rebuilds the "top 100 movies / top 20 shows" lists.
 *
 * IMDb's chart pages are behind bot protection, so instead of scraping we
 * compute the chart from IMDb's official daily datasets
 * (https://datasets.imdbws.com) using the published Top 250 formula:
 *
 *   WR = (v / (v + m)) * R + (m / (v + m)) * C
 *
 * with m = 25,000 minimum votes and C = the mean rating of qualifying
 * titles. This tracks the real chart near-exactly (IMDb additionally
 * applies an undisclosed per-voter weighting, so a rank or two may differ).
 *
 * Each ranked title is then resolved to TMDB for posters/genres/metadata.
 *
 * Run with: npm run snapshot
 */
import "./load-env";

import * as readline from "node:readline";
import { Readable } from "node:stream";
import * as zlib from "node:zlib";
import { eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import { titles, topListEntries } from "../src/db/schema";
import { findByImdbId, genreMap, type TmdbFindResponse } from "../src/lib/tmdb";

const RATINGS_URL = "https://datasets.imdbws.com/title.ratings.tsv.gz";
const BASICS_URL = "https://datasets.imdbws.com/title.basics.tsv.gz";
const MIN_VOTES = 25_000;

// `take` is a buffer beyond what the site displays (top 100 movies / 20 shows).
// The extra ranks let the Top Lists page hide titles you've watched and
// backfill from further down the chart so the list stays full. See
// DISPLAY_LIMIT in src/components/TopLists.tsx.
const LISTS = {
  movies: { take: 150, kind: "movie", imdbTypes: ["movie"] },
  shows: { take: 40, kind: "tv", imdbTypes: ["tvSeries", "tvMiniSeries"] },
} as const;

async function* tsvLines(url: string): AsyncGenerator<string> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download failed: ${res.status} for ${url}`);
  const stream = Readable.fromWeb(res.body as import("node:stream/web").ReadableStream).pipe(
    zlib.createGunzip(),
  );
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) yield line;
}

interface Candidate {
  imdbId: string;
  rating: number;
  votes: number;
  imdbType?: string;
  imdbName?: string;
}

async function loadCandidates(): Promise<Map<string, Candidate>> {
  console.log("Downloading title.ratings (≈8 MB)…");
  const candidates = new Map<string, Candidate>();
  let header = true;
  for await (const line of tsvLines(RATINGS_URL)) {
    if (header) { header = false; continue; }
    const [imdbId, rating, votes] = line.split("\t");
    const v = Number(votes);
    if (v >= MIN_VOTES) {
      candidates.set(imdbId, { imdbId, rating: Number(rating), votes: v });
    }
  }
  console.log(`  ${candidates.size} titles with ≥${MIN_VOTES.toLocaleString()} votes`);
  return candidates;
}

async function classifyCandidates(candidates: Map<string, Candidate>) {
  console.log("Streaming title.basics (≈220 MB) to classify title types…");
  let header = true;
  let matched = 0;
  for await (const line of tsvLines(BASICS_URL)) {
    if (header) { header = false; continue; }
    const tab = line.indexOf("\t");
    const imdbId = line.slice(0, tab);
    const candidate = candidates.get(imdbId);
    if (!candidate) continue;
    const cols = line.split("\t");
    candidate.imdbType = cols[1];
    candidate.imdbName = cols[2];
    matched++;
  }
  console.log(`  classified ${matched} candidates`);
}

function rankList(
  candidates: Map<string, Candidate>,
  imdbTypes: readonly string[],
): Candidate[] {
  const pool = [...candidates.values()].filter(
    (c) => c.imdbType && imdbTypes.includes(c.imdbType),
  );
  const meanRating = pool.reduce((sum, c) => sum + c.rating, 0) / pool.length;
  const weighted = (c: Candidate) =>
    (c.votes / (c.votes + MIN_VOTES)) * c.rating +
    (MIN_VOTES / (c.votes + MIN_VOTES)) * meanRating;
  return pool.sort((a, b) => weighted(b) - weighted(a) || b.votes - a.votes);
}

interface NormalizedTitle {
  tmdbId: number;
  name: string;
  date?: string;
  posterPath: string | null;
  overview: string | null;
  genreIds: number[];
}

function normalize(found: TmdbFindResponse, kind: "movie" | "tv"): NormalizedTitle | null {
  if (kind === "movie") {
    const h = found.movie_results[0];
    if (!h) return null;
    return {
      tmdbId: h.id,
      name: h.title,
      date: h.release_date,
      posterPath: h.poster_path ?? null,
      overview: h.overview ?? null,
      genreIds: h.genre_ids ?? [],
    };
  }
  const h = found.tv_results[0];
  if (!h) return null;
  return {
    tmdbId: h.id,
    name: h.name,
    date: h.first_air_date,
    posterPath: h.poster_path ?? null,
    overview: h.overview ?? null,
    genreIds: h.genre_ids ?? [],
  };
}

async function upsertTitle(row: {
  tmdbId: number;
  mediaType: "movie" | "tv";
  imdbId: string;
  name: string;
  year: number | null;
  posterPath: string | null;
  genres: string[];
  overview: string | null;
}): Promise<number> {
  const [inserted] = await db
    .insert(titles)
    .values(row)
    .onConflictDoUpdate({
      target: [titles.tmdbId, titles.mediaType],
      set: {
        imdbId: row.imdbId,
        name: row.name,
        year: row.year,
        posterPath: row.posterPath,
        genres: row.genres,
        overview: row.overview,
        updatedAt: sql`(datetime('now'))`,
      },
    })
    .returning({ id: titles.id });
  return inserted.id;
}

async function saveList(
  listType: keyof typeof LISTS,
  ranked: Candidate[],
): Promise<void> {
  const { take, kind } = LISTS[listType];
  console.log(`\nResolving top ${take} ${listType} via TMDB…`);
  const genres = await genreMap(kind);
  const entries: { rank: number; titleId: number }[] = [];

  for (const candidate of ranked) {
    if (entries.length >= take) break;
    const norm = normalize(await findByImdbId(candidate.imdbId), kind);
    if (!norm) {
      console.warn(`  skipping ${candidate.imdbName ?? candidate.imdbId}: no TMDB match`);
      continue;
    }
    const titleId = await upsertTitle({
      tmdbId: norm.tmdbId,
      mediaType: kind,
      imdbId: candidate.imdbId,
      name: norm.name,
      year: norm.date ? Number(norm.date.slice(0, 4)) : null,
      posterPath: norm.posterPath,
      genres: norm.genreIds.map((id) => genres.get(id)).filter((g): g is string => !!g),
      overview: norm.overview,
    });
    entries.push({ rank: entries.length + 1, titleId });
    if (entries.length % 25 === 0) console.log(`  …${entries.length}/${take}`);
  }

  await db.transaction(async (tx) => {
    await tx.delete(topListEntries).where(eq(topListEntries.listType, listType));
    await tx.insert(topListEntries).values(entries.map((e) => ({ ...e, listType })));
  });
  console.log(`Saved ${entries.length} ${listType} entries.`);
}

async function main() {
  const candidates = await loadCandidates();
  await classifyCandidates(candidates);
  await saveList("movies", rankList(candidates, LISTS.movies.imdbTypes));
  await saveList("shows", rankList(candidates, LISTS.shows.imdbTypes));
  console.log("\nSnapshot complete ✅");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
