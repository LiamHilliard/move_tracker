"use client";

import { useTransition } from "react";
import { deleteWatch } from "@/app/actions";

export function DeleteWatchButton({ watchId, label }: { watchId: number; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete this entry for ${label}?`)) {
          startTransition(() => deleteWatch(watchId));
        }
      }}
      className="rounded-md px-2 py-1 text-zinc-600 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
      title="Delete entry"
    >
      ✕
    </button>
  );
}
