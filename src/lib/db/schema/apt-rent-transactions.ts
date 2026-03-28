import {
  pgTable,
  text,
  integer,
  numeric,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const aptRentTransactions = pgTable("apt_rent_transactions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  regionCode: text("region_code").notNull(),
  regionName: text("region_name").notNull(),
  aptName: text("apt_name").notNull(),
  sizeSqm: numeric("size_sqm"),
  floor: integer("floor"),
  deposit: integer("deposit"),
  monthlyRent: integer("monthly_rent"),
  rentType: text("rent_type"),
  contractType: text("contract_type"),
  tradeDate: text("trade_date"),
  preDeposit: integer("pre_deposit"),
  preMonthlyRent: integer("pre_monthly_rent"),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AptRentTransaction = typeof aptRentTransactions.$inferSelect;
export type NewAptRentTransaction = typeof aptRentTransactions.$inferInsert;
