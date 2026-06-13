-- DonJup CockroachDB bootstrap schema.
-- Keep this file aligned with src/lib/db/schema/*.ts.

CREATE TABLE IF NOT EXISTS apt_complexes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::STRING,
  region_code TEXT NOT NULL,
  region_name TEXT NOT NULL,
  dong_name TEXT,
  apt_name TEXT NOT NULL,
  address TEXT,
  total_units INTEGER,
  built_year INTEGER,
  slug TEXT NOT NULL UNIQUE,
  govt_complex_id TEXT UNIQUE,
  parking_count INTEGER,
  heating_method TEXT,
  floor_count INTEGER,
  latitude DECIMAL,
  longitude DECIMAL,
  property_type INTEGER NOT NULL DEFAULT 1,
  sido_name TEXT,
  floor_area_ratio DECIMAL,
  building_coverage DECIMAL,
  energy_grade TEXT,
  elevator_count INTEGER,
  land_area DECIMAL,
  building_area DECIMAL,
  total_floor_area DECIMAL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complexes_region ON apt_complexes(region_code);
CREATE INDEX IF NOT EXISTS idx_complexes_name ON apt_complexes(apt_name);
CREATE INDEX IF NOT EXISTS idx_complexes_coords ON apt_complexes(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_complexes_govt_complex_id ON apt_complexes(govt_complex_id) WHERE govt_complex_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS apt_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::STRING,
  complex_id TEXT,
  region_code TEXT NOT NULL,
  region_name TEXT NOT NULL,
  apt_name TEXT NOT NULL,
  size_sqm DECIMAL NOT NULL,
  floor INTEGER,
  trade_price INTEGER NOT NULL,
  trade_date TEXT NOT NULL,
  highest_price INTEGER,
  change_rate DECIMAL,
  is_new_high BOOLEAN NOT NULL DEFAULT false,
  is_significant_drop BOOLEAN NOT NULL DEFAULT false,
  deal_type TEXT,
  drop_level TEXT NOT NULL DEFAULT 'none',
  property_type INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_txn_region_date ON apt_transactions(region_code, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_txn_complex ON apt_transactions(complex_id);
CREATE INDEX IF NOT EXISTS idx_txn_trade_date ON apt_transactions(trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_txn_significant ON apt_transactions(is_significant_drop, is_new_high)
  WHERE is_significant_drop = true OR is_new_high = true;
CREATE INDEX IF NOT EXISTS idx_txn_change_rate ON apt_transactions(change_rate ASC) WHERE change_rate IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_txn_property_type ON apt_transactions(property_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_txn_unique ON apt_transactions(apt_name, size_sqm, floor, trade_date, trade_price);

CREATE TABLE IF NOT EXISTS apt_rent_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::STRING,
  region_code TEXT NOT NULL,
  region_name TEXT NOT NULL,
  apt_name TEXT NOT NULL,
  size_sqm DECIMAL,
  floor INTEGER,
  deposit INTEGER,
  monthly_rent INTEGER,
  rent_type TEXT,
  contract_type TEXT,
  trade_date TEXT,
  pre_deposit INTEGER,
  pre_monthly_rent INTEGER,
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rent_region_date ON apt_rent_transactions(region_code, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_rent_lookup ON apt_rent_transactions(
  apt_name,
  size_sqm,
  floor,
  trade_date,
  deposit,
  monthly_rent
);

CREATE TABLE IF NOT EXISTS finance_rates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::STRING,
  rate_type TEXT NOT NULL,
  rate_value DECIMAL NOT NULL,
  prev_value DECIMAL,
  change_bp INTEGER,
  base_date TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT finance_rates_rate_type_base_date_unique UNIQUE (rate_type, base_date)
);

CREATE INDEX IF NOT EXISTS idx_rates_type_date ON finance_rates(rate_type, base_date DESC);

CREATE TABLE IF NOT EXISTS daily_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::STRING,
  report_date TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  top_drops JSONB,
  top_highs JSONB,
  rate_summary JSONB,
  volume_summary JSONB,
  og_image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS page_views (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  page_path TEXT NOT NULL,
  page_type TEXT,
  region_code TEXT,
  complex_id TEXT,
  view_date TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT idx_views_path_date UNIQUE (page_path, view_date)
);

CREATE INDEX IF NOT EXISTS idx_views_type_date ON page_views(page_type, view_date);
CREATE INDEX IF NOT EXISTS idx_views_region_date ON page_views(region_code, view_date);
CREATE INDEX IF NOT EXISTS idx_views_complex ON page_views(complex_id, view_date);

CREATE TABLE IF NOT EXISTS content_queue (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::STRING,
  report_date TEXT NOT NULL,
  content_type TEXT NOT NULL,
  storage_urls TEXT[] NOT NULL,
  caption TEXT,
  hashtags TEXT[],
  status TEXT NOT NULL DEFAULT 'pending',
  posted_at TIMESTAMP,
  platform_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT idx_content_queue_unique UNIQUE (report_date, content_type)
);

CREATE INDEX IF NOT EXISTS idx_content_queue_date ON content_queue(report_date DESC);

CREATE TABLE IF NOT EXISTS seeding_queue (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::STRING,
  report_date TEXT NOT NULL,
  platform TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT idx_seeding_queue_unique UNIQUE (report_date, platform)
);

CREATE INDEX IF NOT EXISTS idx_seeding_queue_date ON seeding_queue(report_date DESC, platform);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::STRING,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reb_price_indices (
  index_type TEXT NOT NULL,
  region_name TEXT NOT NULL,
  index_value DECIMAL NOT NULL,
  base_date TEXT NOT NULL,
  prev_value DECIMAL,
  change_rate DECIMAL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT reb_price_indices_compound_unique UNIQUE (index_type, region_name, base_date)
);

CREATE INDEX IF NOT EXISTS idx_reb_type_date ON reb_price_indices(index_type, base_date DESC);

CREATE TABLE IF NOT EXISTS homepage_cache (
  id INTEGER PRIMARY KEY,
  drops JSONB,
  highs JSONB,
  volume JSONB,
  recent JSONB,
  rates JSONB,
  total_transactions INTEGER,
  total_complexes INTEGER,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_daily (
  id INT8 PRIMARY KEY DEFAULT unique_rowid(),
  date DATE NOT NULL UNIQUE,
  page_views INTEGER DEFAULT 0,
  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  avg_session_duration DECIMAL(10, 2) DEFAULT 0,
  bounce_rate DECIMAL(5, 2) DEFAULT 0,
  top_pages JSONB,
  top_referrers JSONB,
  collected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instagram_posts (
  media_id TEXT PRIMARY KEY,
  content_queue_id TEXT,
  report_date TEXT,
  content_type TEXT,
  caption TEXT,
  image_urls TEXT[],
  image_count INTEGER,
  post_type TEXT,
  posted_at TIMESTAMP
);
