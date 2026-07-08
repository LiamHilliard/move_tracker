"use client";

import { useState } from "react";

function Star({ fill }: { fill: 0 | 0.5 | 1 }) {
  const id = `star-${fill}`;
  return (
    <svg viewBox="0 0 24 24" className="h-full w-auto" aria-hidden>
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="currentColor" />
          <stop offset={`${fill * 100}%`} stopColor="rgb(63 63 70)" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        d="M12 2l2.9 6.26 6.86.83-5.07 4.7 1.35 6.77L12 17.2l-6.04 3.36 1.35-6.77-5.07-4.7 6.86-.83z"
      />
    </svg>
  );
}

/** Read-only star display, e.g. 3.5 → ★★★½☆ */
export function Stars({ rating, className = "h-3.5" }: { rating: number; className?: string }) {
  return (
    <span className={`inline-flex text-amber-400 ${className}`} title={`${rating}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} fill={rating >= i ? 1 : rating >= i - 0.5 ? 0.5 : 0} />
      ))}
    </span>
  );
}

/** Interactive half-star picker. `sm` drops the label for compact rows. */
export function StarPicker({
  value,
  onChange,
  size = "md",
}: {
  value: number | null;
  onChange: (rating: number) => void;
  size?: "md" | "sm";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  const box = size === "md" ? "h-10 w-10" : "h-7 w-7";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={size === "md" ? "flex h-10" : "flex h-7"} onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`relative ${box}`}>
            <div className="pointer-events-none h-full w-full text-amber-400">
              <Star fill={shown >= i ? 1 : shown >= i - 0.5 ? 0.5 : 0} />
            </div>
            {/* left/right halves */}
            <button
              type="button"
              aria-label={`${i - 0.5} stars`}
              className="absolute inset-y-0 left-0 w-1/2"
              onMouseEnter={() => setHover(i - 0.5)}
              onClick={() => onChange(i - 0.5)}
            />
            <button
              type="button"
              aria-label={`${i} stars`}
              className="absolute inset-y-0 right-0 w-1/2"
              onMouseEnter={() => setHover(i)}
              onClick={() => onChange(i)}
            />
          </div>
        ))}
      </div>
      {size === "md" && (
        <span className="h-4 text-sm text-zinc-400">
          {shown > 0 ? `${shown} / 5` : "Tap to rate"}
        </span>
      )}
    </div>
  );
}
