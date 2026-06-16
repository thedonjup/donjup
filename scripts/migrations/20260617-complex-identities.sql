CREATE TABLE IF NOT EXISTS apt_complex_identities (
  id TEXT PRIMARY KEY,
  canonical_id TEXT NOT NULL UNIQUE,
  region_code TEXT NOT NULL,
  region_name TEXT NOT NULL,
  dong_name TEXT,
  apt_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  built_year INT,
  bonbun TEXT,
  bubun TEXT,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  identity_status TEXT NOT NULL DEFAULT 'active',
  confidence INT NOT NULL DEFAULT 100,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS apt_complex_identity_sources (
  id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL,
  source TEXT NOT NULL,
  source_complex_id TEXT NOT NULL,
  source_payload JSONB,
  confidence INT NOT NULL DEFAULT 100,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE (source, source_complex_id)
);

CREATE TABLE IF NOT EXISTS apt_complex_aliases (
  id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL,
  alias_type TEXT NOT NULL,
  alias_value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (alias_type, alias_value)
);

ALTER TABLE apt_complexes
  ADD COLUMN IF NOT EXISTS identity_id TEXT;

ALTER TABLE apt_transactions
  ADD COLUMN IF NOT EXISTS identity_id TEXT;

ALTER TABLE apt_rent_transactions
  ADD COLUMN IF NOT EXISTS complex_id TEXT;

ALTER TABLE apt_rent_transactions
  ADD COLUMN IF NOT EXISTS identity_id TEXT;

CREATE INDEX IF NOT EXISTS idx_complexes_identity_id
  ON apt_complexes(identity_id);

CREATE INDEX IF NOT EXISTS idx_transactions_identity_id
  ON apt_transactions(identity_id);

CREATE INDEX IF NOT EXISTS idx_rent_complex_id
  ON apt_rent_transactions(complex_id);

CREATE INDEX IF NOT EXISTS idx_rent_identity_id
  ON apt_rent_transactions(identity_id);

CREATE INDEX IF NOT EXISTS idx_complex_identities_region_name
  ON apt_complex_identities(region_code, dong_name, normalized_name);

CREATE INDEX IF NOT EXISTS idx_complex_identity_sources_identity
  ON apt_complex_identity_sources(identity_id);

CREATE INDEX IF NOT EXISTS idx_complex_aliases_identity
  ON apt_complex_aliases(identity_id);
