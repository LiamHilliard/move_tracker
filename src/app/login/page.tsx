import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_COOKIE, passcodeHash } from "@/lib/auth";

async function login(formData: FormData) {
  "use server";
  const attempt = formData.get("passcode");
  const passcode = process.env.PASSCODE;
  if (!passcode || typeof attempt !== "string" || attempt !== passcode) {
    redirect("/login?error=1");
  }
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, await passcodeHash(passcode), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  redirect("/");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center">
      <form action={login} className="flex w-72 flex-col gap-4">
        <h1 className="text-center text-2xl font-bold tracking-tight">
          🎬 Watch Tracker
        </h1>
        <input
          type="password"
          name="passcode"
          placeholder="Passcode"
          autoFocus
          required
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none focus:border-amber-500"
        />
        {error && (
          <p className="text-center text-sm text-red-400">Wrong passcode, try again.</p>
        )}
        <button
          type="submit"
          className="rounded-lg bg-amber-500 px-4 py-3 font-semibold text-zinc-950 hover:bg-amber-400"
        >
          Enter
        </button>
      </form>
    </main>
  );
}
