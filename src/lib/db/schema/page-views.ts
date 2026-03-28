import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  pagePath: text("page_path").notNull(),
  pageType: text("page_type"),
  regionCode: text("region_code"),
  complexId: text("complex_id"),
  viewDate: text("view_date").notNull(),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PageView = typeof pageViews.$inferSelect;
export type NewPageView = typeof pageViews.$inferInsert;
