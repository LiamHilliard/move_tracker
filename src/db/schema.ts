import { sql } from "drizzle-orm";
import {
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // stored lowercase; login lookups lowercase the input
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    // bumped on password reset / deactivation to invalidate outstanding cookies
    tokenVersion: integer("token_version").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [uniqueIndex("users_username_idx").on(t.username)],
);

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
  // default(1) exists only so the multi-user migration could backfill
  // pre-existing rows to the first admin via an additive ALTER; every
  // write path sets userId explicitly from the session.
  userId: integer("user_id")
    .notNull()
    .default(1)
    .references(() => users.id),
  titleId: integer("title_id")
    .notNull()
    .references(() => titles.id),
  // null for movies; season number for TV
  seasonNumber: integer("season_number"),
  // half-star scale: 0.5–5.0
  rating: real("rating").notNull(),
  // "YYYY-MM" month granularity; rows logged before 2026-07 may be "YYYY-MM-DD"
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
    // see watches.userId for why default(1) exists
    userId: integer("user_id")
      .notNull()
      .default(1)
      .references(() => users.id),
    titleId: integer("title_id")
      .notNull()
      .references(() => titles.id),
    addedAt: text("added_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [uniqueIndex("watchlist_user_title_idx").on(t.userId, t.titleId)],
);

export type User = typeof users.$inferSelect;
export type Title = typeof titles.$inferSelect;
export type TopListEntry = typeof topListEntries.$inferSelect;
export type Watch = typeof watches.$inferSelect;
export type WatchlistItem = typeof watchlist.$inferSelect;
