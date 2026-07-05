"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ensureTitle } from "@/app/actions";
import type { Suggestion } from "@/lib/suggest";
import { TMDB_POSTER_BASE } from "@/lib/tmdb-images";
import type { ListItem } from "@/lib/types";
import { LogDialog } from "./LogDialog";

export type MediaFilter = "all" | "movie" | "tv";

export function SuggestionGrid({
  items,
  filter,
}: {
  items: Suggestion[];
  filter: MediaFilter;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<ListItem | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const visible = items.filter((s) => filter === "all" || s.mediaType === filter);
  if (visible.length === 0) {
    return <p className="text-sm text-zinc-500">Nothing here right now.</p>;
  }

  function select(s: Suggestion) {
    setPendingKey(`${s.mediaType}:${s.tmdbId}`);
    startTransition(async () => {
      const item = await ensureTitle({ tmdbId: s.tmdbId, mediaType: s.mediaType });
      setSelected(item);
      setPendingKey(null);
    });
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {visible.map((s) => {
          const key = `${s.mediaType}:${s.tmdbId}`;
          return (
            <button
              key={key}
              type="button"
              onClick={() => select(s)}
              className={`group text-left ${pendingKey === key ? "animate-pulse" : ""}`}
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-zinc-900 ring-zinc-700 transition group-hover:ring-2">
                {s.posterPath ? (
                  <Image
                    src={`${TMDB_POSTER_BASE}${s.posterPath}`}
                    alt={s.name}
                    fill
                    sizes="(max-width: 640px) 33vw, 16vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-2 text-center text-xs text-zinc-500">
                    {s.name}
                  </div>
                )}
                <span className="absolute right-1 top-1 rounded bg-black/80 px-1 py-0.5 text-[10px] uppercase text-zinc-300">
                  {s.mediaType === "movie" ? "film" : "tv"}
                </span>
              </div>
              <p className="mt-1.5 truncate text-xs font-medium">
                {s.name}
                {s.year && <span className="text-zinc-500"> ’{String(s.year).slice(2)}</span>}
              </p>
              <p className="truncate text-[11px] text-zinc-500">{s.reason}</p>
            </button>
          );
        })}
      </div>

      {selected && (
        <LogDialog
          item={selected}
          onClose={() => {
            setSelected(null);
            router.refresh(); // recompute suggestions with the new data
          }}
        />
      )}
    </>
  );
}
