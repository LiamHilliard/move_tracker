import "./load-env";
import { mkdirSync, writeFileSync } from "node:fs";
import { db } from "../src/db";
import { titles, watches, watchlist } from "../src/db/schema";

// Dumps the personal tables (watches, watchlist) to backups/backup-<ts>.json
// so a schema migration gone wrong can be undone with restore-user-data.ts.

async function main() {
  const url = process.env.DATABASE_URL ?? "file:local.db";
  const [watchRows, watchlistRows, titleRows] = await Promise.all([
    db.select().from(watches),
    db.select().from(watchlist),
    db.select({ id: titles.id }).from(titles),
  ]);

  mkdirSync("backups", { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = `backups/backup-${stamp}.json`;
  writeFileSync(
    file,
    JSON.stringify(
      {
        databaseUrl: url,
        backedUpAt: new Date().toISOString(),
        counts: {
          watches: watchRows.length,
          watchlist: watchlistRows.length,
          titles: titleRows.length,
        },
        watches: watchRows,
        watchlist: watchlistRows,
      },
      null,
      2,
    ),
  );

  console.log(`Backed up ${url} -> ${file}`);
  console.log(
    `  watches: ${watchRows.length}, watchlist: ${watchlistRows.length}, titles: ${titleRows.length}`,
  );
}

main().then(() => process.exit(0));
