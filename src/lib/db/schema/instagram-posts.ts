import {
  pgTable,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const instagramPosts = pgTable("instagram_posts", {
  mediaId: text("media_id").primaryKey(),
  contentQueueId: text("content_queue_id"),
  reportDate: text("report_date"),
  contentType: text("content_type"),
  caption: text("caption"),
  imageUrls: text("image_urls").array(),
  imageCount: integer("image_count"),
  postType: text("post_type"),
  postedAt: timestamp("posted_at"),
});

export type InstagramPost = typeof instagramPosts.$inferSelect;
export type NewInstagramPost = typeof instagramPosts.$inferInsert;
