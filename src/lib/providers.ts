import { eq } from "drizzle-orm";
import { db } from "@/db";
import { titles, type Title } from "@/db/schema";
import { watchProviders } from "@/lib/tmdb";

const REGION = process.env.WATCH_REGION ?? "CA";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type Provider = { name: string; logoPath: string };

function isFresh(fetchedAt: string | null): boolean {
  return fetchedAt != null && Date.now() - Date.parse(fetchedAt) < MAX_AGE_MS;
}

/** Streaming providers for a title, cached in the DB for a week. */
export async function getProviders(title: Title): Promise<Provider[]> {
  if (isFresh(title.providersFetchedAt)) return title.providers ?? [];
  const providers = await watchProviders(title.mediaType, title.tmdbId, REGION).catch(
    () => [] as Provider[],
  );
  await db
    .update(titles)
    .set({ providers, providersFetchedAt: new Date().toISOString() })
    .where(eq(titles.id, title.id));
  return providers;
}
