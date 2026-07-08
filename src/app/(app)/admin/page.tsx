import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/current-user";
import { createUser, resetPassword, setUserActive } from "./actions";

export const metadata = { title: "Admin · Watch Tracker" };
export const dynamic = "force-dynamic";

const inputClass =
  "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500";

export default async function AdminPage() {
  const admin = await requireAdmin();
  const allUsers = await db.select().from(users).orderBy(asc(users.id));

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Admin</h1>
      <p className="mb-6 text-sm text-zinc-400">
        Accounts for friends & family — everyone gets their own watches, ratings, and
        watchlist.
      </p>

      <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">Add someone</h2>
        <form action={createUser} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            name="username"
            placeholder="Username"
            required
            autoCapitalize="none"
            autoCorrect="off"
            className={inputClass}
          />
          <input
            type="text"
            name="password"
            placeholder="Starter password"
            required
            className={inputClass}
          />
          <button
            type="submit"
            className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
          >
            Create account
          </button>
        </form>
        <p className="mt-2 text-xs text-zinc-500">
          Share the username and starter password with them; you can reset it here any
          time.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        {allUsers.map((u) => (
          <div
            key={u.id}
            className={`rounded-xl border border-zinc-800 p-4 ${
              u.isActive ? "bg-zinc-900/60" : "bg-zinc-950 opacity-60"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-zinc-100">{u.username}</span>
              {u.isAdmin && (
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-medium text-amber-400">
                  admin
                </span>
              )}
              {!u.isActive && (
                <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-xs font-medium text-red-400">
                  deactivated
                </span>
              )}
              <span className="ml-auto text-xs text-zinc-500">
                joined {u.createdAt.slice(0, 10)}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <form action={resetPassword} className="flex items-center gap-2">
                <input type="hidden" name="userId" value={u.id} />
                <input
                  type="text"
                  name="password"
                  placeholder="New password"
                  required
                  className={inputClass}
                />
                <button
                  type="submit"
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  Reset password
                </button>
              </form>
              {u.id !== admin.id && (
                <form action={setUserActive}>
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="active" value={String(!u.isActive)} />
                  <button
                    type="submit"
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                      u.isActive
                        ? "border-red-900/60 text-red-400 hover:bg-red-950/40"
                        : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    {u.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
