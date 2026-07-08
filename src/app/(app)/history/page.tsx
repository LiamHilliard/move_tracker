import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { titles, watches } from "@/db/schema";
import { HistoryList, type HistoryEntry } from "@/components/HistoryList";

export const metadata = { title: "History · Watch Tracker" };
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const rows = await db
    .select({ watch: watches, title: titles })
    .from(watches)
    .innerJoin(titles, eq(titles.id, watches.titleId))
    .orderBy(desc(watches.watchedAt), desc(watches.id));

  const entries: HistoryEntry[] = rows.map(({ watch, title }) => ({
    watchId: watch.id,
    titleId: title.id,
    name: title.name,
    posterPath: title.posterPath,
    mediaType: title.mediaType,
    seasonNumber: watch.seasonNumber,
    rating: watch.rating,
    watchedAt: watch.watchedAt,
    isRewatch: watch.isRewatch,
  }));

  const thisYear = new Date().getFullYear().toString();
  const yearCount = entries.filter((e) => e.watchedAt.startsWith(thisYear)).length;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">History</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Your watch diary — tap an entry to edit it.
          </p>
        </div>
        <p className="text-sm text-zinc-400">
          <span className="font-semibold text-amber-400">{yearCount}</span> this year ·{" "}
          <span className="font-semibold text-zinc-200">{entries.length}</span> total
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-6 text-center text-sm text-zinc-400">
          Nothing logged yet — check off a classic on the Top Lists, or search anything
          on the Log page.
        </p>
      ) : (
        <HistoryList entries={entries} />
      )}
    </main>
  );
}
