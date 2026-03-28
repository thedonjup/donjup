import {
  pgTable,
  text,
  numeric,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const rebPriceIndices = pgTable("reb_price_indices", {
  indexType: text("index_type").notNull(),
  regionName: text("region_name").notNull(),
  indexValue: numeric("index_value").notNull(),
  baseDate: text("base_date").notNull(),
  prevValue: numeric("prev_value"),
  changeRate: numeric("change_rate"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [unique("reb_price_indices_compound_unique").on(t.indexType, t.regionName, t.baseDate)]);

export type RebPriceIndex = typeof rebPriceIndices.$inferSelect;
export type NewRebPriceIndex = typeof rebPriceIndices.$inferInsert;
