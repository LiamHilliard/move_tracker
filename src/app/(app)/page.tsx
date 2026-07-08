import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { titles, topListEntries, watches, watchlist } from "@/db/schema";
import { TopLists } from "@/components/TopLists";
import { getCurrentUser } from "@/lib/current-user";
import type { ListItem } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadLists(
  userId: number | null,
): Promise<{ movies: ListItem[]; shows: ListItem[] }> {
  const [entries, watchRows, watchlistRows] = await Promise.all([
    db
      .select({
        rank: topListEntries.rank,
        listType: topListEntries.listType,
        title: titles,
      })
      .from(topListEntries)
      .innerJoin(titles, eq(titles.id, topListEntries.titleId))
      .orderBy(asc(topListEntries.rank)),
    // Guests get the bare lists — no personal badges to compute.
    userId == null
      ? []
      : db
          .select()
          .from(watches)
          .where(eq(watches.userId, userId))
          .orderBy(asc(watches.watchedAt), asc(watches.id)),
    userId == null
      ? []
      : db.select().from(watchlist).where(eq(watchlist.userId, userId)),
  ]);

  // Latest rating per (title, season) scope; rows are ordered oldest→newest,
  // so later rows overwrite earlier ones.
  const scopesByTitle = new Map<number, Map<number | null, { rating: number; count: number }>>();
  const displayRating = new Map<number, number>();
  for (const w of watchRows) {
    let scopes = scopesByTitle.get(w.titleId);
    if (!scopes) scopesByTitle.set(w.titleId, (scopes = new Map()));
    const prev = scopes.get(w.seasonNumber);
    scopes.set(w.seasonNumber, { rating: w.rating, count: (prev?.count ?? 0) + 1 });
    displayRating.set(w.titleId, w.rating);
  }
  const onWatchlist = new Set(watchlistRows.map((w) => w.titleId));

  const toItem = (e: (typeof entries)[number]): ListItem => ({
    titleId: e.title.id,
    mediaType: e.title.mediaType,
    name: e.title.name,
    year: e.title.year,
    posterPath: e.title.posterPath,
    genres: e.title.genres ?? [],
    rank: e.rank,
    onWatchlist: onWatchlist.has(e.title.id),
    seasonCount: e.title.seasonCount,
    scopes: [...(scopesByTitle.get(e.title.id) ?? new Map()).entries()].map(
      ([season, v]) => ({ season, rating: v.rating, count: v.count }),
    ),
    displayRating: displayRating.get(e.title.id) ?? null,
  });

  return {
    movies: entries.filter((e) => e.listType === "movies").map(toItem),
    shows: entries.filter((e) => e.listType === "shows").map(toItem),
  };
}

export default async function Home() {
  const user = await getCurrentUser();
  const { movies, shows } = await loadLists(user?.id ?? null);
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Top Lists</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {user
            ? "The top 100 movies and 20 shows — tap a poster to log it."
            : "The top 100 movies and 20 shows — log in to track what you've watched."}
        </p>
      </header>
      <TopLists movies={movies} shows={shows} canLog={user != null} />
    </main>
  );
}
