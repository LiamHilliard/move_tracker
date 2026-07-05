"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { ensureTitle } from "@/app/actions";
import type { SearchResult } from "@/app/api/search/route";
import { TMDB_POSTER_BASE } from "@/lib/tmdb-images";
import type { ListItem } from "@/lib/types";
import { LogDialog } from "./LogDialog";

export function SearchLog() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ListItem | null>(null);
  const [pending, startTransition] = useTransition();
  const requestSeq = useRef(0);

  async function runSearch(q: string) {
    const seq = ++requestSeq.current;
    if (!q.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    // Ignore responses that arrive after a newer query was typed.
    if (seq === requestSeq.current) {
      setResults(data.results);
      setSearching(false);
    }
  }

  useEffect(() => {
    setSearching(query.trim().length > 0);
    const t = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  function select(r: SearchResult) {
    startTransition(async () => {
      const item = await ensureTitle({ tmdbId: r.tmdbId, mediaType: r.mediaType });
      setSelected(item);
    });
  }

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search any movie or show…"
        autoFocus
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-lg text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-amber-500"
      />

      {searching && <p className="mt-6 text-sm text-zinc-500">Searching…</p>}

      {!searching && query.trim() && results.length === 0 && (
        <p className="mt-6 text-sm text-zinc-500">No results for “{query}”.</p>
      )}

      <ul className="mt-4 divide-y divide-zinc-800/70">
        {results.map((r) => (
          <li key={`${r.mediaType}:${r.tmdbId}`}>
            <button
              type="button"
              onClick={() => select(r)}
              disabled={pending}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-zinc-900 disabled:opacity-60"
            >
              {r.posterPath ? (
                <Image
                  src={`${TMDB_POSTER_BASE}${r.posterPath}`}
                  alt=""
                  width={40}
                  height={60}
                  className="h-[60px] w-10 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="h-[60px] w-10 shrink-0 rounded bg-zinc-800" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {r.name}
                  {r.year && <span className="text-zinc-500"> ({r.year})</span>}
                </p>
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  {r.mediaType === "movie" ? "Movie" : "TV show"}
                </p>
              </div>
              {r.watched && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
                  ✓ watched
                </span>
              )}
              {!r.watched && r.onWatchlist && (
                <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs text-sky-400">
                  watchlist
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <LogDialog
          item={selected}
          onClose={() => {
            setSelected(null);
            runSearch(query); // refresh watched/watchlist badges
          }}
        />
      )}
    </div>
  );
}
