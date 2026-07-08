import "./load-env";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { hashPassword } from "../src/lib/password";

// Sets a new password for an existing user (in place — never deletes the row,
// so ids stay stable). Bumps tokenVersion to invalidate any live sessions.
//
//   npx tsx scripts/set-password.ts <username> <newPassword>

async function main() {
  const [username, password] = process.argv.slice(2);
  if (!username || !password) {
    console.error("Usage: npx tsx scripts/set-password.ts <username> <newPassword>");
    process.exit(1);
  }
  if (password.length < 4) {
    console.error("Password must be at least 4 characters.");
    process.exit(1);
  }

  const normalized = username.toLowerCase();
  const [existing] = await db
    .select({ id: users.id, tokenVersion: users.tokenVersion })
    .from(users)
    .where(eq(users.username, normalized));
  if (!existing) {
    console.error(`No such user: "${normalized}"`);
    process.exit(1);
  }

  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(password),
      tokenVersion: existing.tokenVersion + 1,
    })
    .where(eq(users.id, existing.id));

  console.log(
    `Updated password for "${normalized}" (id ${existing.id}) in ${process.env.DATABASE_URL ?? "file:local.db"}`,
  );
}

main().then(() => process.exit(0));
