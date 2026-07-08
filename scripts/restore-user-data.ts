import "./load-env";
import { readFileSync } from "node:fs";
import { db } from "../src/db";
import { watches, watchlist } from "../src/db/schema";

// Restores watches/watchlist rows from a backup-user-data.ts JSON dump,
// preserving row ids. Also usable to seed a fresh local.db from a prod
// backup for migration rehearsal. Refuses to run if the tables aren't empty.

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npx tsx scripts/restore-user-data.ts <backup.json>");
    process.exit(1);
  }
  const backup = JSON.parse(readFileSync(file, "utf8")) as {
    counts: { watches: number; watchlist: number };
    watches: (typeof watches.$inferInsert)[];
    watchlist: (typeof watchlist.$inferInsert)[];
  };

  const [existingWatches, existingWatchlist] = await Promise.all([
    db.select().from(watches),
    db.select().from(watchlist),
  ]);
  if (existingWatches.length > 0 || existingWatchlist.length > 0) {
    console.error(
      `Refusing to restore: target already has ${existingWatches.length} watches / ${existingWatchlist.length} watchlist rows.`,
    );
    process.exit(1);
  }

  if (backup.watches.length > 0) await db.insert(watches).values(backup.watches);
  if (backup.watchlist.length > 0) await db.insert(watchlist).values(backup.watchlist);

  console.log(
    `Restored ${backup.watches.length} watches and ${backup.watchlist.length} watchlist rows into ${process.env.DATABASE_URL ?? "file:local.db"}`,
  );
}

main().then(() => process.exit(0));
