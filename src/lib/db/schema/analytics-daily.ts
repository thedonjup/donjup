import {
  pgTable,
  serial,
  date,
  integer,
  numeric,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export const analyticsDaily = pgTable("analytics_daily", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(),
  pageViews: integer("page_views").default(0),
  sessions: integer("sessions").default(0),
  users: integer("users").default(0),
  newUsers: integer("new_users").default(0),
  avgSessionDuration: numeric("avg_session_duration", { precision: 10, scale: 2 }).default("0"),
  bounceRate: numeric("bounce_rate", { precision: 5, scale: 2 }).default("0"),
  topPages: jsonb("top_pages"),
  topReferrers: jsonb("top_referrers"),
  collectedAt: timestamp("collected_at", { withTimezone: true }).defaultNow(),
});

export type AnalyticsDaily = typeof analyticsDaily.$inferSelect;
export type NewAnalyticsDaily = typeof analyticsDaily.$inferInsert;
