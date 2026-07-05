import { sql } from "drizzle-orm";
import {
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const titles = sqliteTable(
  "titles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tmdbId: integer("tmdb_id").notNull(),
    mediaType: text("media_type", { enum: ["movie", "tv"] }).notNull(),
    imdbId: text("imdb_id"),
    name: text("name").notNull(),
    year: integer("year"),
    posterPath: text("poster_path"),
    genres: text("genres", { mode: "json" }).$type<string[]>().default([]),
    overview: text("overview"),
    seasonCount: integer("season_count"),
    // Streaming providers for WATCH_REGION, cached from TMDB.
    providers: text("providers", { mode: "json" }).$type<
      { name: string; logoPath: string }[]
    >(),
    providersFetchedAt: text("providers_fetched_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [uniqueIndex("titles_tmdb_media_idx").on(t.tmdbId, t.mediaType)],
);

export const topListEntries = sqliteTable(
  "top_list_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    listType: text("list_type", { enum: ["movies", "shows"] }).notNull(),
    rank: integer("rank").notNull(),
    titleId: integer("title_id")
      .notNull()
      .references(() => titles.id),
    snapshotAt: text("snapshot_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [uniqueIndex("top_list_rank_idx").on(t.listType, t.rank)],
);

export const watches = sqliteTable("watches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  titleId: integer("title_id")
    .notNull()
    .references(() => titles.id),
  // null for movies; season number for TV
  seasonNumber: integer("season_number"),
  // half-star scale: 0.5–5.0
  rating: real("rating").notNull(),
  watchedAt: text("watched_at").notNull(),
  isRewatch: integer("is_rewatch", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const watchlist = sqliteTable(
  "watchlist",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    titleId: integer("title_id")
      .notNull()
      .references(() => titles.id),
    addedAt: text("added_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [uniqueIndex("watchlist_title_idx").on(t.titleId)],
);

export type Title = typeof titles.$inferSelect;
export type TopListEntry = typeof topListEntries.$inferSelect;
export type Watch = typeof watches.$inferSelect;
export type WatchlistItem = typeof watchlist.$inferSelect;
