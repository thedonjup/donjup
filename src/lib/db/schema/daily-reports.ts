import {
  pgTable,
  text,
  jsonb,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const dailyReports = pgTable("daily_reports", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  reportDate: text("report_date").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary"),
  topDrops: jsonb("top_drops"),
  topHighs: jsonb("top_highs"),
  rateSummary: jsonb("rate_summary"),
  volumeSummary: jsonb("volume_summary"),
  ogImageUrl: text("og_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type DailyReport = typeof dailyReports.$inferSelect;
export type NewDailyReport = typeof dailyReports.$inferInsert;
