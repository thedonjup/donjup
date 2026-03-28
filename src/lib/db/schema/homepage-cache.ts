import {
  pgTable,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export const homepageCache = pgTable("homepage_cache", {
  id: integer("id").primaryKey(),
  drops: jsonb("drops"),
  highs: jsonb("highs"),
  volume: jsonb("volume"),
  recent: jsonb("recent"),
  rates: jsonb("rates"),
  totalTransactions: integer("total_transactions"),
  totalComplexes: integer("total_complexes"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type HomepageCache = typeof homepageCache.$inferSelect;
export type NewHomepageCache = typeof homepageCache.$inferInsert;
