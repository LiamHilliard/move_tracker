"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { logWatches, toggleWatchlist, updateLatestWatch } from "@/app/actions";
import { TMDB_POSTER_BASE } from "@/lib/tmdb-images";
import type { ListItem } from "@/lib/types";
import { MonthPicker, thisMonth } from "./MonthPicker";
import { StarPicker, Stars } from "./Stars";

export function LogDialog({ item, onClose }: { item: ListItem; onClose: () => void }) {
  const isTv = item.mediaType === "tv";
  // Selected seasons → rating (movies use a single `null` scope).
  const [ratings, setRatings] = useState<Map<number | null, number | null>>(() => {
    if (!isTv) return new Map([[null, null]]);
    // default to the first season not yet rated
    for (let s = 1; s <= (item.seasonCount ?? 99); s++) {
      if (!item.scopes.some((sc) => sc.season === s)) return new Map([[s, null]]);
    }
    return new Map([[1, null]]);
  });
  const [month, setMonth] = useState(thisMonth());
  const [seasonCount, setSeasonCount] = useState<number | null>(item.seasonCount);
  const [mode, setMode] = useState<"rewatch" | "update">("rewatch");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<{ name: string; logoPath: string }[] | null>(
    null,
  );

  useEffect(() => {
    fetch(`/api/titles/${item.titleId}/providers`)
      .then((r) => r.json())
      .then((d) => setProviders(d.providers ?? []))
      .catch(() => setProviders([]));
  }, [item.titleId]);

  // Lazily fetch season count for TV titles the first time they're opened.
  useEffect(() => {
    if (!isTv || seasonCount != null) return;
    fetch(`/api/titles/${item.titleId}/seasons`)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.seasonCount === "number") setSeasonCount(d.seasonCount);
      })
      .catch(() => setError("Couldn't load seasons"));
  }, [isTv, seasonCount, item.titleId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const selected = [...ratings.keys()].sort((a, b) => (a ?? 0) - (b ?? 0));
  const ratedScope = (season: number | null) =>
    item.scopes.find((sc) => sc.season === season);

  // "Rewatch vs fix rating" only makes sense for a single already-rated scope.
  const single = selected.length === 1 ? selected[0] : undefined;
  const singleRated = selected.length === 1 ? ratedScope(single ?? null) : undefined;
  const updating = singleRated != null && mode === "update";
  const complete = selected.length > 0 && [...ratings.values()].every((r) => r != null);

  function toggleSeason(s: number) {
    setRatings((prev) => {
      const next = new Map(prev);
      if (next.has(s)) {
        if (next.size > 1) next.delete(s);
      } else {
        next.set(s, null);
      }
      return next;
    });
  }

  function setRating(scope: number | null, rating: number) {
    setRatings((prev) => new Map(prev).set(scope, rating));
  }

  function submit() {
    if (!complete) return;
    setError(null);
    startTransition(async () => {
      try {
        if (updating) {
          await updateLatestWatch({
            titleId: item.titleId,
            rating: ratings.get(single ?? null)!,
            seasonNumber: single ?? null,
          });
        } else {
          await logWatches({
            titleId: item.titleId,
            watchedAt: month,
            entries: selected.map((scope) => ({
              seasonNumber: scope,
              rating: ratings.get(scope)!,
              isRewatch: ratedScope(scope) != null,
            })),
          });
        }
        onClose();
      } catch {
        setError("Something went wrong — try again.");
      }
    });
  }

  function watchlist() {
    startTransition(async () => {
      await toggleWatchlist(item.titleId);
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[88dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-zinc-800 bg-zinc-950 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-h-[90vh] sm:rounded-2xl sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-4">
          {item.posterPath && (
            <Image
              src={`${TMDB_POSTER_BASE}${item.posterPath}`}
              alt=""
              width={64}
              height={96}
              className="h-24 w-16 rounded-md object-cover"
            />
          )}
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{item.name}</h2>
            <p className="text-sm text-zinc-400">
              {item.year}
              {item.genres.length > 0 && ` · ${item.genres.slice(0, 3).join(", ")}`}
            </p>
            {singleRated && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-400">
                Rated <Stars rating={singleRated.rating} className="h-3" />
                {isTv ? ` (S${single})` : ""}
              </p>
            )}
            {providers && providers.length > 0 && (
              <p className="mt-2 flex items-center gap-1.5">
                <span className="text-xs text-zinc-500">Streaming on</span>
                {providers.map((p) => (
                  <Image
                    key={p.name}
                    src={`https://image.tmdb.org/t/p/w92${p.logoPath}`}
                    alt={p.name}
                    title={p.name}
                    width={20}
                    height={20}
                    className="h-5 w-5 rounded"
                  />
                ))}
              </p>
            )}
          </div>
        </div>

        {isTv && (
          <div className="mt-4">
            <p className="mb-1.5 text-sm text-zinc-400">
              Seasons <span className="text-zinc-600">— pick as many as you watched</span>
            </p>
            {seasonCount == null ? (
              <p className="text-sm text-zinc-500">Loading seasons…</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: seasonCount }, (_, i) => i + 1).map((s) => {
                  const rated = ratedScope(s) != null;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSeason(s)}
                      className={`h-9 min-w-9 rounded-lg border px-2 text-sm ${
                        ratings.has(s)
                          ? "border-amber-500 bg-amber-500/15 text-amber-300"
                          : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                      }`}
                    >
                      {s}
                      {rated && <span className="ml-0.5 text-[10px] text-emerald-400">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selected.length === 1 ? (
          <div className="mt-5 flex justify-center">
            <StarPicker
              value={ratings.get(selected[0]) ?? null}
              onChange={(r) => setRating(selected[0], r)}
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-1.5">
            {selected.map((s) => (
              <li
                key={s}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5"
              >
                <span className="text-sm font-medium text-zinc-300">Season {s}</span>
                <StarPicker
                  size="sm"
                  value={ratings.get(s) ?? null}
                  onChange={(r) => setRating(s, r)}
                />
              </li>
            ))}
          </ul>
        )}

        {singleRated && (
          <div className="mt-4 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setMode("rewatch")}
              className={`rounded-lg border px-3 py-2 text-sm ${
                mode === "rewatch"
                  ? "border-amber-500 bg-amber-500/15 text-amber-300"
                  : "border-zinc-700 text-zinc-400"
              }`}
            >
              Log a rewatch
            </button>
            <button
              type="button"
              onClick={() => setMode("update")}
              className={`rounded-lg border px-3 py-2 text-sm ${
                mode === "update"
                  ? "border-amber-500 bg-amber-500/15 text-amber-300"
                  : "border-zinc-700 text-zinc-400"
              }`}
            >
              Fix my rating
            </button>
          </div>
        )}

        {!updating && (
          <div className="mt-4">
            <p className="mb-1 text-sm text-zinc-400">Watched in</p>
            <MonthPicker value={month} onChange={setMonth} />
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={!complete || pending}
            className="flex-1 rounded-lg bg-amber-500 px-4 py-2.5 font-semibold text-zinc-950 disabled:opacity-40"
          >
            {pending
              ? "Saving…"
              : updating
                ? "Update rating"
                : selected.length > 1
                  ? `Log ${selected.length} seasons`
                  : "Log watch"}
          </button>
          <button
            type="button"
            onClick={watchlist}
            disabled={pending}
            className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:border-zinc-500"
          >
            {item.onWatchlist ? "Remove from watchlist" : "+ Watchlist"}
          </button>
        </div>
      </div>
    </div>
  );
}
