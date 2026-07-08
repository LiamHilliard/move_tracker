import "./load-env";
import { mkdirSync, writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { db } from "../src/db";

// Dumps the personal tables (watches, watchlist) to backups/backup-<ts>.json
// so a schema migration gone wrong can be undone with restore-user-data.ts.
//
// Reads with raw `SELECT *` (not the typed schema) on purpose: this runs
// against the OLD database *before* a migration, so it must capture whatever
// columns exist then, not the columns the current schema code expects.

async function selectAll(table: string): Promise<Record<string, unknown>[]> {
  const res = await db.run(sql.raw(`select * from ${table}`));
  return res.rows as unknown as Record<string, unknown>[];
}

async function main() {
  const url = process.env.DATABASE_URL ?? "file:local.db";
  const [watchRows, watchlistRows, titleRows] = await Promise.all([
    selectAll("watches"),
    selectAll("watchlist"),
    selectAll("titles"),
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
