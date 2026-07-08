import "./load-env";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { hashPassword } from "../src/lib/password";

// Bootstraps a user from the CLI (the first admin has to come from somewhere;
// after that the /admin page handles account management).
//
//   npx tsx scripts/create-user.ts [--admin] <username> <password>

async function main() {
  const args = process.argv.slice(2);
  const isAdmin = args.includes("--admin");
  const [username, password] = args.filter((a) => a !== "--admin");
  if (!username || !password) {
    console.error("Usage: npx tsx scripts/create-user.ts [--admin] <username> <password>");
    process.exit(1);
  }
  if (password.length < 4) {
    console.error("Password must be at least 4 characters.");
    process.exit(1);
  }

  const normalized = username.toLowerCase();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, normalized));
  if (existing.length > 0) {
    console.error(`User "${normalized}" already exists (id ${existing[0].id}).`);
    process.exit(1);
  }

  const [created] = await db
    .insert(users)
    .values({
      username: normalized,
      passwordHash: await hashPassword(password),
      isAdmin,
    })
    .returning({ id: users.id });

  console.log(
    `Created ${isAdmin ? "admin " : ""}user "${normalized}" with id ${created.id} in ${process.env.DATABASE_URL ?? "file:local.db"}`,
  );
}

main().then(() => process.exit(0));
