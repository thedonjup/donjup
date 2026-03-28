import {
  pgTable,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const aptTransactions = pgTable("apt_transactions", {
  id: text("id").primaryKey(),
  complexId: text("complex_id"),
  regionCode: text("region_code").notNull(),
  regionName: text("region_name").notNull(),
  aptName: text("apt_name").notNull(),
  sizeSqm: numeric("size_sqm").notNull(),
  floor: integer("floor"),
  tradePrice: integer("trade_price").notNull(),
  tradeDate: text("trade_date").notNull(),
  highestPrice: integer("highest_price"),
  changeRate: numeric("change_rate"),
  isNewHigh: boolean("is_new_high").notNull().default(false),
  isSignificantDrop: boolean("is_significant_drop").notNull().default(false),
  dealType: text("deal_type"),
  dropLevel: text("drop_level").notNull().default("none"),
  propertyType: integer("property_type").notNull().default(1),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AptTransaction = typeof aptTransactions.$inferSelect;
export type NewAptTransaction = typeof aptTransactions.$inferInsert;
