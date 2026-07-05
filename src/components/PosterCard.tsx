"use client";

import Image from "next/image";
import { TMDB_POSTER_BASE } from "@/lib/tmdb-images";
import { isWatched, type ListItem } from "@/lib/types";
import { Stars } from "./Stars";

export function PosterCard({
  item,
  onClick,
  providers,
  priority,
}: {
  item: ListItem;
  onClick: () => void;
  providers?: { name: string; logoPath: string }[];
  priority?: boolean;
}) {
  const watched = isWatched(item);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block w-full overflow-hidden rounded-lg bg-zinc-900 text-left ring-zinc-700 transition hover:ring-2 focus-visible:ring-2 focus-visible:ring-amber-500"
    >
      <div className="relative aspect-[2/3] w-full">
        {item.posterPath ? (
          <Image
            src={`${TMDB_POSTER_BASE}${item.posterPath}`}
            alt={item.name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
            className={`object-cover transition ${watched ? "opacity-40" : "group-hover:opacity-80"}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-2 text-center text-sm text-zinc-500">
            {item.name}
          </div>
        )}
      </div>

      {item.rank != null && (
        <span className="absolute left-1.5 top-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs font-bold text-zinc-100">
          {item.rank}
        </span>
      )}

      {watched && (
        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-zinc-950">
          ✓
        </span>
      )}
      {!watched && item.onWatchlist && (
        <span
          className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-xs text-zinc-950"
          title="On watchlist"
        >
          ◉
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 pb-1.5 pt-6">
        <p className="truncate text-xs font-medium text-zinc-100">
          {item.name}
          {item.year ? <span className="text-zinc-400"> ’{String(item.year).slice(2)}</span> : null}
        </p>
        {watched && item.displayRating != null && (
          <p className="mt-0.5 flex items-center gap-1.5">
            <Stars rating={item.displayRating} className="h-3" />
            {item.mediaType === "tv" && item.seasonCount != null && (
              <span className="text-[10px] text-zinc-400">
                {item.scopes.length}/{item.seasonCount} seasons
              </span>
            )}
          </p>
        )}
        {providers && providers.length > 0 && (
          <p className="mt-1 flex gap-1">
            {providers.slice(0, 4).map((p) => (
              <Image
                key={p.name}
                src={`https://image.tmdb.org/t/p/w92${p.logoPath}`}
                alt={p.name}
                title={p.name}
                width={16}
                height={16}
                className="h-4 w-4 rounded-sm"
              />
            ))}
          </p>
        )}
      </div>
    </button>
  );
}
