"use client";

import { useState } from "react";
import type { Suggestion } from "@/lib/suggest";
import { SuggestionGrid, type MediaFilter } from "./SuggestionGrid";

export function SuggestionsView({
  classics,
  similar,
  seedCount,
}: {
  classics: Suggestion[];
  similar: Suggestion[];
  seedCount: number;
}) {
  const [filter, setFilter] = useState<MediaFilter>("all");

  return (
    <div>
      <div className="mb-6 flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1 w-fit">
        {(
          [
            ["all", "All"],
            ["movie", "Movies"],
            ["tv", "Shows"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
              filter === value
                ? "bg-zinc-700 text-zinc-50"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold">From the classics</h2>
        <p className="mb-4 text-sm text-zinc-400">
          Top-list titles you haven’t seen, closest to your taste first.
        </p>
        <SuggestionGrid items={classics} filter={filter} />
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Because you liked…</h2>
        <p className="mb-4 text-sm text-zinc-400">
          {seedCount > 0
            ? `Seeded from your last ${seedCount} four-star-plus ratings.`
            : "Rate a few things 4★ or higher and this section will come alive."}
        </p>
        <SuggestionGrid items={similar} filter={filter} />
      </section>
    </div>
  );
}
