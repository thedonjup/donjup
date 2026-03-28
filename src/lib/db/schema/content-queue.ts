import {
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const contentQueue = pgTable("content_queue", {
  id: text("id").primaryKey(),
  reportDate: text("report_date").notNull(),
  contentType: text("content_type").notNull(),
  storageUrls: text("storage_urls").array().notNull(),
  caption: text("caption"),
  hashtags: text("hashtags").array(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ContentQueue = typeof contentQueue.$inferSelect;
export type NewContentQueue = typeof contentQueue.$inferInsert;
