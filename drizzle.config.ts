import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  // Ekim 2026'da MySQL'den (Railway) Supabase PostgreSQL'e geçildi; eski MySQL migration'ları drizzle/mysql-legacy/ altında.
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
