"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { logWatch, toggleWatchlist, updateLatestWatch } from "@/app/actions";
import { TMDB_POSTER_BASE } from "@/lib/tmdb-images";
import type { ListItem } from "@/lib/types";
import { StarPicker, Stars } from "./Stars";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function LogDialog({ item, onClose }: { item: ListItem; onClose: () => void }) {
  const isTv = item.mediaType === "tv";
  const [rating, setRating] = useState<number | null>(null);
  const [date, setDate] = useState(today());
  const [season, setSeason] = useState<number>(() => {
    if (!isTv) return 0;
    // default to the first season not yet rated
    for (let s = 1; s <= (item.seasonCount ?? 99); s++) {
      if (!item.scopes.some((sc) => sc.season === s)) return s;
    }
    return 1;
  });
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

  const scope = item.scopes.find((sc) => sc.season === (isTv ? season : null));
  const alreadyRated = scope != null;

  function submit() {
    if (rating == null) return;
    setError(null);
    startTransition(async () => {
      try {
        if (alreadyRated && mode === "update") {
          await updateLatestWatch({
            titleId: item.titleId,
            rating,
            seasonNumber: isTv ? season : null,
          });
        } else {
          await logWatch({
            titleId: item.titleId,
            rating,
            watchedAt: date,
            seasonNumber: isTv ? season : null,
            isRewatch: alreadyRated,
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
        className="w-full max-w-md rounded-t-2xl border border-zinc-800 bg-zinc-950 p-5 sm:rounded-2xl"
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
            {alreadyRated && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-400">
                Rated <Stars rating={scope.rating} className="h-3" />
                {isTv ? ` (S${season})` : ""}
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
            <p className="mb-1.5 text-sm text-zinc-400">Season</p>
            {seasonCount == null ? (
              <p className="text-sm text-zinc-500">Loading seasons…</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: seasonCount }, (_, i) => i + 1).map((s) => {
                  const rated = item.scopes.some((sc) => sc.season === s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeason(s)}
                      className={`h-9 min-w-9 rounded-lg border px-2 text-sm ${
                        season === s
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

        <div className="mt-5 flex justify-center">
          <StarPicker value={rating} onChange={setRating} />
        </div>

        {alreadyRated && (
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

        {!(alreadyRated && mode === "update") && (
          <label className="mt-4 block">
            <span className="text-sm text-zinc-400">Watched on</span>
            <input
              type="date"
              value={date}
              max={today()}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 [color-scheme:dark]"
            />
          </label>
        )}

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={rating == null || pending}
            className="flex-1 rounded-lg bg-amber-500 px-4 py-2.5 font-semibold text-zinc-950 disabled:opacity-40"
          >
            {pending ? "Saving…" : alreadyRated && mode === "update" ? "Update rating" : "Log watch"}
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
