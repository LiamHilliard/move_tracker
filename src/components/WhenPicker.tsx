"use client";

/**
 * Coarse "when did you watch it" buckets. We still store month granularity
 * ("YYYY-MM") so the History diary keeps working, but the user only picks a
 * rough recency rather than an exact month.
 */
export type WatchedBucket = "today" | "year" | "old";

const OPTIONS: { bucket: WatchedBucket; label: string }[] = [
  { bucket: "today", label: "Today" },
  { bucket: "year", label: "This year" },
  { bucket: "old", label: "5+ years ago" },
];

/** Representative month stored for each bucket. */
export function bucketToMonth(bucket: WatchedBucket): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  if (bucket === "today") return `${y}-${m}`;
  if (bucket === "year") return `${y}-01`;
  return `${y - 5}-01`;
}

export function WhenPicker({
  value,
  onChange,
}: {
  value: WatchedBucket | null;
  onChange: (bucket: WatchedBucket) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {OPTIONS.map(({ bucket, label }) => (
        <button
          key={bucket}
          type="button"
          onClick={() => onChange(bucket)}
          className={`rounded-lg border px-2 py-2 text-sm ${
            value === bucket
              ? "border-amber-500 bg-amber-500/15 text-amber-300"
              : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
