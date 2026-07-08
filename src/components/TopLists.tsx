"use client";

import { useState } from "react";
import { isWatched, type ListItem } from "@/lib/types";
import { LogDialog } from "./LogDialog";
import { PosterCard } from "./PosterCard";
import { SearchLog } from "./SearchLog";

// How many titles each list should show. The DB holds a buffer beyond these
// (see scripts/snapshot.ts) so watched titles can be dropped and the list
// backfilled from further down the chart.
const DISPLAY_LIMIT = { movies: 100, shows: 20 } as const;

export function TopLists({
  movies,
  shows,
  canLog,
}: {
  movies: ListItem[];
  shows: ListItem[];
  canLog: boolean;
}) {
  const [tab, setTab] = useState<"movies" | "shows">("movies");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);

  const all = tab === "movies" ? movies : shows;
  const watchedCount = all.filter(isWatched).length;
  // Hide titles you've watched and backfill from the buffer to keep the list full.
  const items = all.filter((i) => !isWatched(i)).slice(0, DISPLAY_LIMIT[tab]);
  // Look up by id so the dialog always renders fresh data after a save.
  const selected =
    [...movies, ...shows].find((i) => i.titleId === selectedId) ?? null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
            {(["movies", "shows"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize ${
                  tab === t ? "bg-zinc-700 text-zinc-50" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {canLog && (
            <button
              type="button"
              onClick={() => setSearching((s) => !s)}
              aria-label={searching ? "Close search" : "Search to log anything"}
              aria-pressed={searching}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                searching
                  ? "border-amber-500 bg-amber-500/15 text-amber-300"
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {searching ? (
                <span className="text-lg leading-none">×</span>
              ) : (
                <SearchIcon />
              )}
            </button>
          )}
        </div>
        {canLog && !searching && (
          <p className="text-sm text-zinc-400">
            <span className="font-semibold text-amber-400">{watchedCount}</span>/
            {DISPLAY_LIMIT[tab]} watched
          </p>
        )}
      </div>

      {searching ? (
        <div className="mt-5">
          <SearchLog />
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {items.map((item, i) => (
            <PosterCard
              key={item.titleId}
              item={item}
              priority={i < 5}
              onClick={canLog ? () => setSelectedId(item.titleId) : undefined}
            />
          ))}
        </div>
      )}

      {canLog && selected && (
        <LogDialog item={selected} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className="h-4 w-4"
      aria-hidden
    >
      <circle cx={11} cy={11} r={7} />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
