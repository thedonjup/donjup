import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const aptComplexIdentities = pgTable("apt_complex_identities", {
  id: text("id").primaryKey(),
  canonicalId: text("canonical_id").notNull().unique(),
  regionCode: text("region_code").notNull(),
  regionName: text("region_name").notNull(),
  dongName: text("dong_name"),
  aptName: text("apt_name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  builtYear: integer("built_year"),
  bonbun: text("bonbun"),
  bubun: text("bubun"),
  address: text("address"),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  identityStatus: text("identity_status").notNull().default("active"),
  confidence: integer("confidence").notNull().default(100),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("idx_complex_identities_region_name").on(t.regionCode, t.dongName, t.normalizedName),
]);

export const aptComplexIdentitySources = pgTable("apt_complex_identity_sources", {
  id: text("id").primaryKey(),
  identityId: text("identity_id").notNull(),
  source: text("source").notNull(),
  sourceComplexId: text("source_complex_id").notNull(),
  sourcePayload: jsonb("source_payload"),
  confidence: integer("confidence").notNull().default(100),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  unique("idx_complex_identity_sources_source_id").on(t.source, t.sourceComplexId),
  index("idx_complex_identity_sources_identity").on(t.identityId),
]);

export const aptComplexAliases = pgTable("apt_complex_aliases", {
  id: text("id").primaryKey(),
  identityId: text("identity_id").notNull(),
  aliasType: text("alias_type").notNull(),
  aliasValue: text("alias_value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  unique("idx_complex_aliases_type_value").on(t.aliasType, t.aliasValue),
  index("idx_complex_aliases_identity").on(t.identityId),
]);

export type AptComplexIdentity = typeof aptComplexIdentities.$inferSelect;
export type NewAptComplexIdentity = typeof aptComplexIdentities.$inferInsert;
export type AptComplexIdentitySource = typeof aptComplexIdentitySources.$inferSelect;
export type NewAptComplexIdentitySource = typeof aptComplexIdentitySources.$inferInsert;
export type AptComplexAlias = typeof aptComplexAliases.$inferSelect;
export type NewAptComplexAlias = typeof aptComplexAliases.$inferInsert;
