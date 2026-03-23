-- Sprint 2: property_type
ALTER TABLE apt_transactions ADD COLUMN IF NOT EXISTS property_type SMALLINT DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_txn_property_type ON apt_transactions(property_type);

-- Sprint 2: drop_level (from crash criteria v2)
ALTER TABLE apt_transactions ADD COLUMN IF NOT EXISTS drop_level VARCHAR(10) DEFAULT 'normal';

-- Sprint 3: geocoding
ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7);
ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);
CREATE INDEX IF NOT EXISTS idx_complexes_coords ON apt_complexes(latitude, longitude) WHERE latitude IS NOT NULL;
