import { SearchLog } from "@/components/SearchLog";
import { requireUser } from "@/lib/current-user";

export const metadata = { title: "Log · Watch Tracker" };

export default async function LogPage() {
  await requireUser();
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Log a watch</h1>
      <p className="mb-6 text-sm text-zinc-400">
        Anything counts — not just the top lists.
      </p>
      <SearchLog />
    </main>
  );
}
