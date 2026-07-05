import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { titles } from "@/db/schema";
import { tmdb } from "@/lib/tmdb";

// Returns the season count for a TV title, fetching from TMDB and caching
// in the DB on first request.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const titleId = Number(id);
  const [title] = await db.select().from(titles).where(eq(titles.id, titleId));
  if (!title || title.mediaType !== "tv") {
    return NextResponse.json({ error: "Not a TV title" }, { status: 404 });
  }

  let seasonCount = title.seasonCount;
  if (seasonCount == null) {
    const details = await tmdb<{ number_of_seasons: number }>(`/tv/${title.tmdbId}`);
    seasonCount = details.number_of_seasons;
    await db.update(titles).set({ seasonCount }).where(eq(titles.id, titleId));
  }
  return NextResponse.json({ seasonCount });
}
