import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { titles, watchlist } from "@/db/schema";
import { WatchlistGrid } from "@/components/WatchlistGrid";
import { getProviders } from "@/lib/providers";
import { requireUser } from "@/lib/current-user";
import type { ListItem } from "@/lib/types";

export const metadata = { title: "Watchlist · Watch Tracker" };
export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const user = await requireUser();
  const rows = await db
    .select({ item: watchlist, title: titles })
    .from(watchlist)
    .innerJoin(titles, eq(titles.id, watchlist.titleId))
    .where(eq(watchlist.userId, user.id))
    .orderBy(asc(watchlist.addedAt), asc(watchlist.id));

  const providerLists = await Promise.all(rows.map(({ title }) => getProviders(title)));
  const providersByTitle = Object.fromEntries(
    rows.map(({ title }, i) => [title.id, providerLists[i]]),
  );

  const items: ListItem[] = rows.map(({ title }) => ({
    titleId: title.id,
    mediaType: title.mediaType,
    name: title.name,
    year: title.year,
    posterPath: title.posterPath,
    genres: title.genres ?? [],
    onWatchlist: true,
    seasonCount: title.seasonCount,
    scopes: [],
    displayRating: null,
  }));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Watchlist</h1>
      <p className="mb-6 text-sm text-zinc-400">
        Queued up for later — tap one when you’ve watched it.
      </p>
      {items.length === 0 ? (
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-6 text-center text-sm text-zinc-400">
          Nothing queued. Add titles from the{" "}
          <Link href="/suggestions" className="text-amber-400 hover:underline">
            Suggestions
          </Link>{" "}
          page or anywhere you see a poster.
        </p>
      ) : (
        <WatchlistGrid items={items} providersByTitle={providersByTitle} />
      )}
    </main>
  );
}
