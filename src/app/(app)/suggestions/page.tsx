import { SuggestionsView } from "@/components/SuggestionsView";
import { buildSuggestions } from "@/lib/suggest";

export const metadata = { title: "Suggestions · Watch Tracker" };
export const dynamic = "force-dynamic";

export default async function SuggestionsPage() {
  const { classics, similar, seedCount } = await buildSuggestions();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Suggestions</h1>
      <p className="mb-6 text-sm text-zinc-400">
        What to watch next — tap anything to log it or queue it.
      </p>
      <SuggestionsView classics={classics} similar={similar} seedCount={seedCount} />
    </main>
  );
}
