import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { titles, watches, watchlist } from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { searchMulti } from "@/lib/tmdb";

export interface SearchResult {
  tmdbId: number;
  mediaType: "movie" | "tv";
  name: string;
  year: number | null;
  posterPath: string | null;
  watched: boolean;
  onWatchlist: boolean;
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ results: [] });

  const { results } = await searchMulti(q);
  const hits = results
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .slice(0, 24);

  // Attach tracking state for any of these titles we already know about.
  const known = hits.length
    ? await db
        .select()
        .from(titles)
        .where(inArray(titles.tmdbId, hits.map((h) => h.id)))
    : [];
  const knownByKey = new Map(known.map((t) => [`${t.mediaType}:${t.tmdbId}`, t.id]));
  const knownIds = [...knownByKey.values()];
  const [watchRows, watchlistRows] = knownIds.length
    ? await Promise.all([
        db
          .select({ titleId: watches.titleId })
          .from(watches)
          .where(and(eq(watches.userId, user.id), inArray(watches.titleId, knownIds))),
        db
          .select({ titleId: watchlist.titleId })
          .from(watchlist)
          .where(and(eq(watchlist.userId, user.id), inArray(watchlist.titleId, knownIds))),
      ])
    : [[], []];
  const watchedIds = new Set(watchRows.map((w) => w.titleId));
  const listedIds = new Set(watchlistRows.map((w) => w.titleId));

  const payload: SearchResult[] = hits.map((h) => {
    const titleId = knownByKey.get(`${h.media_type}:${h.id}`);
    const date = h.media_type === "movie" ? h.release_date : h.first_air_date;
    return {
      tmdbId: h.id,
      mediaType: h.media_type as "movie" | "tv",
      name: (h.media_type === "movie" ? h.title : h.name) ?? "Untitled",
      year: date ? Number(date.slice(0, 4)) : null,
      posterPath: h.poster_path ?? null,
      watched: titleId != null && watchedIds.has(titleId),
      onWatchlist: titleId != null && listedIds.has(titleId),
    };
  });

  return NextResponse.json({ results: payload });
}
