import {
  pgTable,
  text,
  integer,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";

export const aptComplexes = pgTable("apt_complexes", {
  id: text("id").primaryKey(),
  regionCode: text("region_code").notNull(),
  regionName: text("region_name").notNull(),
  dongName: text("dong_name"),
  aptName: text("apt_name").notNull(),
  address: text("address"),
  totalUnits: integer("total_units"),
  builtYear: integer("built_year"),
  slug: text("slug").notNull(),
  parkingCount: integer("parking_count"),
  heatingMethod: text("heating_method"),
  floorCount: integer("floor_count"),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  propertyType: integer("property_type").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AptComplex = typeof aptComplexes.$inferSelect;
export type NewAptComplex = typeof aptComplexes.$inferInsert;
