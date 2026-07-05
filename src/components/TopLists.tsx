"use client";

import { useState } from "react";
import { isWatched, type ListItem } from "@/lib/types";
import { LogDialog } from "./LogDialog";
import { PosterCard } from "./PosterCard";

export function TopLists({ movies, shows }: { movies: ListItem[]; shows: ListItem[] }) {
  const [tab, setTab] = useState<"movies" | "shows">("movies");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const items = tab === "movies" ? movies : shows;
  const watchedCount = items.filter(isWatched).length;
  // Look up by id so the dialog always renders fresh data after a save.
  const selected =
    [...movies, ...shows].find((i) => i.titleId === selectedId) ?? null;

  return (
    <div>
      <div className="flex items-center justify-between">
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
        <p className="text-sm text-zinc-400">
          <span className="font-semibold text-amber-400">{watchedCount}</span>/{items.length}{" "}
          watched
        </p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {items.map((item, i) => (
          <PosterCard
            key={item.titleId}
            item={item}
            priority={i < 5}
            onClick={() => setSelectedId(item.titleId)}
          />
        ))}
      </div>

      {selected && <LogDialog item={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
