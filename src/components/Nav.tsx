"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/auth-actions";

const USER_LINKS = [
  { href: "/", label: "Top Lists" },
  { href: "/suggestions", label: "Suggestions" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/history", label: "History" },
] as const;

const GUEST_LINKS = [{ href: "/", label: "Top Lists" }] as const;

export type NavUser = { username: string; isAdmin: boolean };

export function Nav({ user }: { user: NavUser | null }) {
  const pathname = usePathname();
  const links = user
    ? user.isAdmin
      ? [...USER_LINKS, { href: "/admin", label: "Admin" } as const]
      : USER_LINKS
    : GUEST_LINKS;
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-3 py-3 sm:gap-6 sm:px-6">
        <Link href="/" className="shrink-0 text-lg font-bold tracking-tight">
          🎬 <span className="hidden sm:inline">Watch Tracker</span>
        </Link>
        <nav className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium sm:px-3 ${
                pathname === l.href
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-sm text-zinc-400 sm:inline">
                {user.username}
              </span>
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-200"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
