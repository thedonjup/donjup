import {
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const seedingQueue = pgTable("seeding_queue", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  reportDate: text("report_date").notNull(),
  platform: text("platform").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  link: text("link"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SeedingQueue = typeof seedingQueue.$inferSelect;
export type NewSeedingQueue = typeof seedingQueue.$inferInsert;
