import { redirect } from "next/navigation";
import { login } from "@/app/auth-actions";
import { getCurrentUser } from "@/lib/current-user";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCurrentUser()) redirect("/");
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center">
      <form action={login} className="flex w-72 flex-col gap-4">
        <h1 className="text-center text-2xl font-bold tracking-tight">
          🎬 Watch Tracker
        </h1>
        <input
          type="text"
          name="username"
          placeholder="Username"
          autoFocus
          required
          autoCapitalize="none"
          autoCorrect="off"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none focus:border-amber-500"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          required
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none focus:border-amber-500"
        />
        {error && (
          <p className="text-center text-sm text-red-400">
            Wrong username or password, try again.
          </p>
        )}
        <button
          type="submit"
          className="rounded-lg bg-amber-500 px-4 py-3 font-semibold text-zinc-950 hover:bg-amber-400"
        >
          Log in
        </button>
      </form>
    </main>
  );
}
