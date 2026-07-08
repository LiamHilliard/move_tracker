"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { deleteWatch, getListItem, updateWatch } from "@/app/actions";
import { TMDB_POSTER_BASE } from "@/lib/tmdb-images";
import type { ListItem } from "@/lib/types";
import { LogDialog } from "./LogDialog";
import { StarPicker, Stars } from "./Stars";
import { bucketToMonth, WhenPicker, type WatchedBucket } from "./WhenPicker";

export interface HistoryEntry {
  watchId: number;
  titleId: number;
  name: string;
  posterPath: string | null;
  mediaType: "movie" | "tv";
  seasonNumber: number | null;
  rating: number;
  watchedAt: string;
  isRewatch: boolean;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthLabel(date: string): string {
  return `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
}

function entryLabel(e: HistoryEntry): string {
  return e.seasonNumber != null ? `${e.name} S${e.seasonNumber}` : e.name;
}

export function HistoryList({ entries }: { entries: HistoryEntry[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Look up by id so the dialog renders fresh data after a save.
  const selected = entries.find((e) => e.watchId === selectedId) ?? null;

  const groups: { label: string; entries: HistoryEntry[] }[] = [];
  for (const entry of entries) {
    const label = monthLabel(entry.watchedAt);
    const last = groups.at(-1);
    if (last?.label === label) last.entries.push(entry);
    else groups.push({ label, entries: [entry] });
  }

  return (
    <>
      {groups.map((group) => (
        <section key={group.label} className="mb-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {group.label}
          </h2>
          <ul className="divide-y divide-zinc-800/70 rounded-xl border border-zinc-800 bg-zinc-900/40">
            {group.entries.map((entry) => (
              <li key={entry.watchId}>
                <button
                  type="button"
                  onClick={() => setSelectedId(entry.watchId)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-zinc-800/40"
                >
                  {entry.posterPath ? (
                    <Image
                      src={`${TMDB_POSTER_BASE}${entry.posterPath}`}
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
                      {entry.name}
                      {entry.seasonNumber != null && (
                        <span className="text-zinc-400"> · S{entry.seasonNumber}</span>
                      )}
                    </p>
                    <p className="flex items-center gap-2">
                      <Stars rating={entry.rating} className="h-3" />
                      {entry.isRewatch && (
                        <span className="rounded-full bg-violet-500/15 px-1.5 py-px text-[10px] text-violet-300">
                          rewatch
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-zinc-600" aria-hidden>
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {selected && (
        <EditWatchDialog entry={selected} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}

function EditWatchDialog({
  entry,
  onClose,
}: {
  entry: HistoryEntry;
  onClose: () => void;
}) {
  const [rating, setRating] = useState<number>(entry.rating);
  // Keep the entry's existing month unless the user picks a new bucket.
  const [when, setWhen] = useState<WatchedBucket | null>(null);
  const [logItem, setLogItem] = useState<ListItem | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const month = when ? bucketToMonth(when) : entry.watchedAt.slice(0, 7);

  // "Log more seasons" hands off to the regular LogDialog for this title.
  if (logItem) {
    return <LogDialog item={logItem} onClose={onClose} />;
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await updateWatch({ watchId: entry.watchId, rating, watchedAt: month });
        onClose();
      } catch {
        setError("Something went wrong — try again.");
      }
    });
  }

  function remove() {
    if (!confirm(`Delete this entry for ${entryLabel(entry)}?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteWatch(entry.watchId);
        onClose();
      } catch {
        setError("Something went wrong — try again.");
      }
    });
  }

  function moreSeasons() {
    setError(null);
    startTransition(async () => {
      try {
        setLogItem(await getListItem(entry.titleId));
      } catch {
        setError("Couldn't load the show — try again.");
      }
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
        <div className="flex items-center gap-4">
          {entry.posterPath ? (
            <Image
              src={`${TMDB_POSTER_BASE}${entry.posterPath}`}
              alt=""
              width={64}
              height={96}
              className="h-24 w-16 rounded-md object-cover"
            />
          ) : (
            <div className="h-24 w-16 rounded-md bg-zinc-800" />
          )}
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{entry.name}</h2>
            <p className="text-sm text-zinc-400">
              {entry.seasonNumber != null && `Season ${entry.seasonNumber} · `}
              {entry.isRewatch ? "Rewatch" : "Watch"} · {monthLabel(entry.watchedAt)}
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-center">
          <StarPicker value={rating} onChange={setRating} />
        </div>

        <div className="mt-4">
          <p className="mb-1 text-sm text-zinc-400">Watched</p>
          <WhenPicker value={when} onChange={setWhen} />
          {when == null && (
            <p className="mt-1 text-xs text-zinc-500">
              Currently {monthLabel(entry.watchedAt)}
            </p>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="flex-1 rounded-lg bg-amber-500 px-4 py-2.5 font-semibold text-zinc-950 disabled:opacity-40"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
          {entry.mediaType === "tv" && (
            <button
              type="button"
              onClick={moreSeasons}
              disabled={pending}
              className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:border-zinc-500"
            >
              + Seasons
            </button>
          )}
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="rounded-lg border border-zinc-800 px-3 py-2.5 text-sm text-zinc-500 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
            title="Delete entry"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
