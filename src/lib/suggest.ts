import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { titles, topListEntries, watches, watchlist } from "@/db/schema";
import { recommendations } from "@/lib/tmdb";

export interface Suggestion {
  tmdbId: number;
  mediaType: "movie" | "tv";
  name: string;
  year: number | null;
  posterPath: string | null;
  /** Shown as the card caption, e.g. "#7 in the top 100" or "Because you liked X". */
  reason: string;
}

const CLASSICS_LIMIT = 18;
const SIMILAR_LIMIT = 18;
const MAX_SEEDS = 8;
const MIN_VOTE_COUNT = 100;

export async function buildSuggestions(userId: number): Promise<{
  classics: Suggestion[];
  similar: Suggestion[];
  seedCount: number;
}> {
  const [entries, watchRows, watchlistRows] = await Promise.all([
    db
      .select({ entry: topListEntries, title: titles })
      .from(topListEntries)
      .innerJoin(titles, eq(titles.id, topListEntries.titleId))
      .orderBy(asc(topListEntries.rank)),
    db
      .select({ watch: watches, title: titles })
      .from(watches)
      .innerJoin(titles, eq(titles.id, watches.titleId))
      .where(eq(watches.userId, userId))
      .orderBy(asc(watches.watchedAt), asc(watches.id)),
    db
      .select({ item: watchlist, title: titles })
      .from(watchlist)
      .innerJoin(titles, eq(titles.id, watchlist.titleId))
      .where(eq(watchlist.userId, userId)),
  ]);

  // Latest rating per (title, season) scope, plus per-title latest info.
  const scopeRatings = new Map<string, { titleId: number; rating: number }>();
  const latestByTitle = new Map<
    number,
    { rating: number; watchedAt: string; title: (typeof watchRows)[number]["title"] }
  >();
  for (const { watch, title } of watchRows) {
    scopeRatings.set(`${watch.titleId}:${watch.seasonNumber ?? "m"}`, {
      titleId: watch.titleId,
      rating: watch.rating,
    });
    latestByTitle.set(watch.titleId, {
      rating: watch.rating,
      watchedAt: watch.watchedAt,
      title,
    });
  }

  const watchedTitleIds = new Set(latestByTitle.keys());
  const watchedTmdbKeys = new Set(
    [...latestByTitle.values()].map((v) => `${v.title.mediaType}:${v.title.tmdbId}`),
  );
  const watchlistTmdbKeys = new Set(
    watchlistRows.map(({ title }) => `${title.mediaType}:${title.tmdbId}`),
  );

  // --- Section 1: unwatched top-list titles, ranked by genre affinity ---

  // How highly does the user rate each genre, on average?
  const genreScore = new Map<string, { sum: number; n: number }>();
  let ratingSum = 0;
  let ratingCount = 0;
  for (const { rating, titleId } of scopeRatings.values()) {
    const title = latestByTitle.get(titleId)?.title;
    ratingSum += rating;
    ratingCount++;
    for (const g of title?.genres ?? []) {
      const s = genreScore.get(g) ?? { sum: 0, n: 0 };
      s.sum += rating;
      s.n++;
      genreScore.set(g, s);
    }
  }
  const globalAvg = ratingCount > 0 ? ratingSum / ratingCount : 0;
  const affinity = (genres: string[]): number => {
    if (genres.length === 0) return globalAvg;
    let sum = 0;
    for (const g of genres) {
      const s = genreScore.get(g);
      sum += s ? s.sum / s.n : globalAvg;
    }
    return sum / genres.length;
  };

  const watchlistTitleIds = new Set(watchlistRows.map(({ item }) => item.titleId));
  const classics = entries
    .filter(
      ({ title }) => !watchedTitleIds.has(title.id) && !watchlistTitleIds.has(title.id),
    )
    .map(({ entry, title }) => ({
      entry,
      title,
      score: affinity(title.genres ?? []),
    }))
    .sort((a, b) => b.score - a.score || a.entry.rank - b.entry.rank)
    .slice(0, CLASSICS_LIMIT)
    .map(({ entry, title }) => ({
      tmdbId: title.tmdbId,
      mediaType: title.mediaType,
      name: title.name,
      year: title.year,
      posterPath: title.posterPath,
      reason: `#${entry.rank} in the top ${entry.listType === "movies" ? "100 movies" : "20 shows"}`,
    }));

  // --- Section 2: TMDB recommendations seeded from 4★+ ratings ---

  const seeds = [...latestByTitle.values()]
    .filter((v) => v.rating >= 4)
    .sort((a, b) => (a.watchedAt < b.watchedAt ? 1 : -1))
    .slice(0, MAX_SEEDS);

  const recLists = await Promise.all(
    seeds.map((s) =>
      recommendations(s.title.mediaType, s.title.tmdbId).catch(() => ({ results: [] })),
    ),
  );

  const candidates = new Map<
    string,
    Suggestion & { seedNames: string[]; voteAverage: number }
  >();
  for (const [i, { results }] of recLists.entries()) {
    const seedName = seeds[i].title.name;
    for (const r of results.slice(0, 12)) {
      const mediaType = r.media_type ?? seeds[i].title.mediaType;
      const key = `${mediaType}:${r.id}`;
      if (r.vote_count < MIN_VOTE_COUNT) continue;
      if (watchedTmdbKeys.has(key) || watchlistTmdbKeys.has(key)) continue;
      const existing = candidates.get(key);
      if (existing) {
        existing.seedNames.push(seedName);
        continue;
      }
      const date = mediaType === "movie" ? r.release_date : r.first_air_date;
      candidates.set(key, {
        tmdbId: r.id,
        mediaType,
        name: (mediaType === "movie" ? r.title : r.name) ?? "Untitled",
        year: date ? Number(date.slice(0, 4)) : null,
        posterPath: r.poster_path ?? null,
        reason: `Because you liked ${seedName}`,
        seedNames: [seedName],
        voteAverage: r.vote_average,
      });
    }
  }

  const similar = [...candidates.values()]
    .sort(
      (a, b) =>
        b.seedNames.length - a.seedNames.length || b.voteAverage - a.voteAverage,
    )
    .slice(0, SIMILAR_LIMIT)
    .map(({ seedNames, voteAverage: _, ...s }) => ({
      ...s,
      reason:
        seedNames.length > 1
          ? `Because you liked ${seedNames[0]} +${seedNames.length - 1} more`
          : s.reason,
    }));

  return { classics, similar, seedCount: seeds.length };
}
