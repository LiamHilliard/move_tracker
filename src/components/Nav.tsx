"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Top Lists" },
  { href: "/suggestions", label: "Suggestions" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/log", label: "Log" },
  { href: "/history", label: "History" },
] as const;

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-6 px-4 py-3 sm:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          🎬 <span className="hidden sm:inline">Watch Tracker</span>
        </Link>
        <nav className="flex gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                pathname === l.href
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
