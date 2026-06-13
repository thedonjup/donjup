import {
  pgTable,
  index,
  serial,
  text,
  integer,
  timestamp,
  unique,
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
}, (t) => [
  unique("idx_views_path_date").on(t.pagePath, t.viewDate),
  index("idx_views_type_date").on(t.pageType, t.viewDate),
  index("idx_views_region_date").on(t.regionCode, t.viewDate),
  index("idx_views_complex").on(t.complexId, t.viewDate),
]);

export type PageView = typeof pageViews.$inferSelect;
export type NewPageView = typeof pageViews.$inferInsert;
