"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/current-user";
import { hashPassword } from "@/lib/password";

function assertCredentials(username: string, password: string) {
  if (!/^[a-z0-9_.-]{2,32}$/.test(username)) {
    throw new Error(
      "Username must be 2–32 characters: letters, numbers, dots, dashes, underscores.",
    );
  }
  if (password.length < 4) throw new Error("Password must be at least 4 characters.");
}

export async function createUser(formData: FormData) {
  await requireAdmin();
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  assertCredentials(username, password);

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username));
  if (existing.length > 0) throw new Error(`"${username}" is already taken.`);

  await db.insert(users).values({
    username,
    passwordHash: await hashPassword(password),
  });
  revalidatePath("/admin");
}

export async function resetPassword(formData: FormData) {
  await requireAdmin();
  const userId = Number(formData.get("userId"));
  const password = String(formData.get("password") ?? "");
  if (!Number.isInteger(userId)) throw new Error("Invalid user");
  if (password.length < 4) throw new Error("Password must be at least 4 characters.");

  // Bumping tokenVersion invalidates every outstanding session cookie.
  const updated = await db
    .update(users)
    .set({
      passwordHash: await hashPassword(password),
      tokenVersion: sql`${users.tokenVersion} + 1`,
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  if (updated.length === 0) throw new Error("No such user");
  revalidatePath("/admin");
}

export async function setUserActive(formData: FormData) {
  const admin = await requireAdmin();
  const userId = Number(formData.get("userId"));
  const active = formData.get("active") === "true";
  if (!Number.isInteger(userId)) throw new Error("Invalid user");
  if (userId === admin.id) throw new Error("You can't deactivate yourself.");

  const updated = await db
    .update(users)
    .set({
      isActive: active,
      // Deactivation must also kill live sessions, not just block new logins.
      ...(active ? {} : { tokenVersion: sql`${users.tokenVersion} + 1` }),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  if (updated.length === 0) throw new Error("No such user");
  revalidatePath("/admin");
}
