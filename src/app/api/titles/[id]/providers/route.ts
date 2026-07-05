import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { titles } from "@/db/schema";
import { getProviders } from "@/lib/providers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [title] = await db.select().from(titles).where(eq(titles.id, Number(id)));
  if (!title) return NextResponse.json({ error: "Unknown title" }, { status: 404 });
  return NextResponse.json({ providers: await getProviders(title) });
}
