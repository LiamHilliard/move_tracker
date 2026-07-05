import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL ?? "file:local.db";
const isTurso = url.startsWith("libsql:");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  ...(isTurso
    ? {
        dialect: "turso",
        dbCredentials: { url, authToken: process.env.DATABASE_AUTH_TOKEN },
      }
    : {
        dialect: "sqlite",
        dbCredentials: { url },
      }),
});
