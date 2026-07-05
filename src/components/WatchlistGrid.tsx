"use client";

import { useState } from "react";
import type { ListItem } from "@/lib/types";
import { LogDialog } from "./LogDialog";
import { PosterCard } from "./PosterCard";

export function WatchlistGrid({
  items,
  providersByTitle = {},
}: {
  items: ListItem[];
  providersByTitle?: Record<number, { name: string; logoPath: string }[]>;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = items.find((i) => i.titleId === selectedId) ?? null;

  return (
    <>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {items.map((item) => (
          <PosterCard
            key={item.titleId}
            item={item}
            providers={providersByTitle[item.titleId]}
            onClick={() => setSelectedId(item.titleId)}
          />
        ))}
      </div>
      {selected && <LogDialog item={selected} onClose={() => setSelectedId(null)} />}
    </>
  );
}
