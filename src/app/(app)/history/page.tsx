import Image from "next/image";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { titles, watches } from "@/db/schema";
import { DeleteWatchButton } from "@/components/DeleteWatchButton";
import { Stars } from "@/components/Stars";
import { TMDB_POSTER_BASE } from "@/lib/tmdb-images";

export const metadata = { title: "History · Watch Tracker" };
export const dynamic = "force-dynamic";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthLabel(date: string): string {
  return `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
}

function dayOfMonth(date: string): string {
  return String(Number(date.slice(8, 10)));
}

export default async function HistoryPage() {
  const rows = await db
    .select({ watch: watches, title: titles })
    .from(watches)
    .innerJoin(titles, eq(titles.id, watches.titleId))
    .orderBy(desc(watches.watchedAt), desc(watches.id));

  const thisYear = new Date().getFullYear().toString();
  const yearCount = rows.filter((r) => r.watch.watchedAt.startsWith(thisYear)).length;

  const groups: { label: string; rows: typeof rows }[] = [];
  for (const row of rows) {
    const label = monthLabel(row.watch.watchedAt);
    const last = groups.at(-1);
    if (last?.label === label) last.rows.push(row);
    else groups.push({ label, rows: [row] });
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">History</h1>
          <p className="mt-1 text-sm text-zinc-400">Your watch diary, newest first.</p>
        </div>
        <p className="text-sm text-zinc-400">
          <span className="font-semibold text-amber-400">{yearCount}</span> this year ·{" "}
          <span className="font-semibold text-zinc-200">{rows.length}</span> total
        </p>
      </div>

      {rows.length === 0 && (
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-6 text-center text-sm text-zinc-400">
          Nothing logged yet — check off a classic on the Top Lists, or search anything
          on the Log page.
        </p>
      )}

      {groups.map((group) => (
        <section key={group.label} className="mb-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {group.label}
          </h2>
          <ul className="divide-y divide-zinc-800/70 rounded-xl border border-zinc-800 bg-zinc-900/40">
            {group.rows.map(({ watch, title }) => (
              <li key={watch.id} className="flex items-center gap-3 px-3 py-2">
                <span className="w-6 text-right font-mono text-sm text-zinc-500">
                  {dayOfMonth(watch.watchedAt)}
                </span>
                {title.posterPath ? (
                  <Image
                    src={`${TMDB_POSTER_BASE}${title.posterPath}`}
                    alt=""
                    width={32}
                    height={48}
                    className="h-12 w-8 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="h-12 w-8 shrink-0 rounded bg-zinc-800" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {title.name}
                    {watch.seasonNumber != null && (
                      <span className="text-zinc-400"> · S{watch.seasonNumber}</span>
                    )}
                  </p>
                  <p className="flex items-center gap-2">
                    <Stars rating={watch.rating} className="h-3" />
                    {watch.isRewatch && (
                      <span className="rounded-full bg-violet-500/15 px-1.5 py-px text-[10px] text-violet-300">
                        rewatch
                      </span>
                    )}
                  </p>
                </div>
                <DeleteWatchButton
                  watchId={watch.id}
                  label={
                    watch.seasonNumber != null
                      ? `${title.name} S${watch.seasonNumber}`
                      : title.name
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
