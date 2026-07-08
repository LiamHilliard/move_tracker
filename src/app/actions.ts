"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { titles, watches, watchlist } from "@/db/schema";
import { movieDetails, tvDetails } from "@/lib/tmdb";
import type { ListItem } from "@/lib/types";

function assertRating(rating: number) {
  if (rating < 0.5 || rating > 5 || (rating * 2) % 1 !== 0) {
    throw new Error(`Invalid rating: ${rating}`);
  }
}

// Watch dates are tracked at month granularity ("YYYY-MM"); rows logged
// before this change may still carry a full "YYYY-MM-DD".
function assertMonth(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error(`Invalid month: ${month}`);
}

export async function logWatches(input: {
  titleId: number;
  watchedAt: string;
  entries: { seasonNumber: number | null; rating: number; isRewatch: boolean }[];
}) {
  assertMonth(input.watchedAt);
  if (input.entries.length === 0) throw new Error("Nothing to log");
  for (const e of input.entries) assertRating(e.rating);
  await db.insert(watches).values(
    input.entries.map((e) => ({
      titleId: input.titleId,
      rating: e.rating,
      watchedAt: input.watchedAt,
      seasonNumber: e.seasonNumber,
      isRewatch: e.isRewatch,
    })),
  );
  // Logging something you meant to watch clears it from the watchlist.
  await db.delete(watchlist).where(eq(watchlist.titleId, input.titleId));
  revalidatePath("/", "layout");
}

export async function updateWatch(input: {
  watchId: number;
  rating: number;
  watchedAt: string;
}) {
  assertRating(input.rating);
  assertMonth(input.watchedAt);
  await db
    .update(watches)
    .set({ rating: input.rating, watchedAt: input.watchedAt })
    .where(eq(watches.id, input.watchId));
  revalidatePath("/", "layout");
}

export async function updateLatestWatch(input: {
  titleId: number;
  rating: number;
  seasonNumber?: number | null;
}) {
  assertRating(input.rating);
  const scope =
    input.seasonNumber != null
      ? and(eq(watches.titleId, input.titleId), eq(watches.seasonNumber, input.seasonNumber))
      : eq(watches.titleId, input.titleId);
  const [latest] = await db
    .select({ id: watches.id })
    .from(watches)
    .where(scope)
    .orderBy(desc(watches.watchedAt), desc(watches.id))
    .limit(1);
  if (!latest) throw new Error("No watch to update");
  await db.update(watches).set({ rating: input.rating }).where(eq(watches.id, latest.id));
  revalidatePath("/", "layout");
}

/**
 * Makes sure a TMDB title exists in our DB (fetching details on first
 * encounter) and returns it as a ListItem with the user's tracking state.
 */
export async function ensureTitle(input: {
  tmdbId: number;
  mediaType: "movie" | "tv";
}): Promise<ListItem> {
  let [title] = await db
    .select()
    .from(titles)
    .where(and(eq(titles.tmdbId, input.tmdbId), eq(titles.mediaType, input.mediaType)));

  if (!title) {
    const row =
      input.mediaType === "movie"
        ? await movieDetails(input.tmdbId).then((d) => ({
            tmdbId: d.id,
            mediaType: "movie" as const,
            imdbId: d.imdb_id ?? null,
            name: d.title,
            year: d.release_date ? Number(d.release_date.slice(0, 4)) : null,
            posterPath: d.poster_path ?? null,
            genres: d.genres.map((g) => g.name),
            overview: d.overview ?? null,
            seasonCount: null,
          }))
        : await tvDetails(input.tmdbId).then((d) => ({
            tmdbId: d.id,
            mediaType: "tv" as const,
            imdbId: d.external_ids?.imdb_id ?? null,
            name: d.name,
            year: d.first_air_date ? Number(d.first_air_date.slice(0, 4)) : null,
            posterPath: d.poster_path ?? null,
            genres: d.genres.map((g) => g.name),
            overview: d.overview ?? null,
            seasonCount: d.number_of_seasons,
          }));
    [title] = await db.insert(titles).values(row).returning();
  }

  return withTrackingState(title);
}

/** Loads an already-known title as a ListItem with the user's tracking state. */
export async function getListItem(titleId: number): Promise<ListItem> {
  const [title] = await db.select().from(titles).where(eq(titles.id, titleId));
  if (!title) throw new Error(`Unknown title: ${titleId}`);
  return withTrackingState(title);
}

async function withTrackingState(title: typeof titles.$inferSelect): Promise<ListItem> {
  const [watchRows, watchlistRows] = await Promise.all([
    db
      .select()
      .from(watches)
      .where(eq(watches.titleId, title.id))
      .orderBy(asc(watches.watchedAt), asc(watches.id)),
    db.select().from(watchlist).where(eq(watchlist.titleId, title.id)),
  ]);
  const scopes = new Map<number | null, { rating: number; count: number }>();
  for (const w of watchRows) {
    const prev = scopes.get(w.seasonNumber);
    scopes.set(w.seasonNumber, { rating: w.rating, count: (prev?.count ?? 0) + 1 });
  }

  return {
    titleId: title.id,
    mediaType: title.mediaType,
    name: title.name,
    year: title.year,
    posterPath: title.posterPath,
    genres: title.genres ?? [],
    onWatchlist: watchlistRows.length > 0,
    seasonCount: title.seasonCount,
    scopes: [...scopes.entries()].map(([season, v]) => ({ season, ...v })),
    displayRating: watchRows.at(-1)?.rating ?? null,
  };
}

export async function deleteWatch(watchId: number) {
  await db.delete(watches).where(eq(watches.id, watchId));
  revalidatePath("/", "layout");
}

export async function toggleWatchlist(titleId: number) {
  const existing = await db
    .select({ id: watchlist.id })
    .from(watchlist)
    .where(eq(watchlist.titleId, titleId));
  if (existing.length > 0) {
    await db.delete(watchlist).where(eq(watchlist.titleId, titleId));
  } else {
    await db.insert(watchlist).values({ titleId });
  }
  revalidatePath("/", "layout");
}
