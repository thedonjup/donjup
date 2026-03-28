import {
  pgTable,
  text,
  integer,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";

export const aptComplexes = pgTable("apt_complexes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  regionCode: text("region_code").notNull(),
  regionName: text("region_name").notNull(),
  dongName: text("dong_name"),
  aptName: text("apt_name").notNull(),
  address: text("address"),
  totalUnits: integer("total_units"),
  builtYear: integer("built_year"),
  slug: text("slug").notNull().unique(),
  parkingCount: integer("parking_count"),
  heatingMethod: text("heating_method"),
  floorCount: integer("floor_count"),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  propertyType: integer("property_type").notNull().default(1),
  sidoName: text("sido_name"),
  floorAreaRatio: numeric("floor_area_ratio"),
  buildingCoverage: numeric("building_coverage"),
  energyGrade: text("energy_grade"),
  elevatorCount: integer("elevator_count"),
  landArea: numeric("land_area"),
  buildingArea: numeric("building_area"),
  totalFloorArea: numeric("total_floor_area"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AptComplex = typeof aptComplexes.$inferSelect;
export type NewAptComplex = typeof aptComplexes.$inferInsert;
