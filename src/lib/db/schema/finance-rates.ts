import {
  pgTable,
  text,
  numeric,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const financeRates = pgTable("finance_rates", {
  id: text("id").primaryKey(),
  rateType: text("rate_type").notNull(),
  rateValue: numeric("rate_value").notNull(),
  prevValue: numeric("prev_value"),
  changeBp: integer("change_bp"),
  baseDate: text("base_date").notNull(),
  source: text("source").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type FinanceRate = typeof financeRates.$inferSelect;
export type NewFinanceRate = typeof financeRates.$inferInsert;
