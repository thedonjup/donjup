-- CockroachDB Schema for donjup
-- Supabase RLS/Policy 제거, gen_random_uuid() 호환

CREATE TABLE IF NOT EXISTS apt_complexes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_code VARCHAR(10) NOT NULL,
    region_name VARCHAR(100) NOT NULL,
    dong_name VARCHAR(50),
    apt_name VARCHAR(200) NOT NULL,
    address VARCHAR(300),
    total_units INTEGER,
    built_year INTEGER,
    slug VARCHAR(200) NOT NULL UNIQUE,
    parking_count INTEGER,
    heating_method VARCHAR(50),
    floor_count INTEGER,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    property_type SMALLINT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complexes_region ON apt_complexes(region_code);
CREATE INDEX IF NOT EXISTS idx_complexes_name ON apt_complexes(apt_name);
CREATE INDEX IF NOT EXISTS idx_complexes_coords ON apt_complexes(latitude, longitude) WHERE latitude IS NOT NULL;

CREATE TABLE IF NOT EXISTS apt_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complex_id UUID REFERENCES apt_complexes(id),
    region_code VARCHAR(10) NOT NULL,
    region_name VARCHAR(100) NOT NULL,
    apt_name VARCHAR(200) NOT NULL,
    size_sqm DECIMAL(6,2) NOT NULL,
    floor INTEGER,
    trade_price BIGINT NOT NULL,
    trade_date DATE NOT NULL,
    highest_price BIGINT,
    change_rate DECIMAL(5,2),
    is_new_high BOOLEAN DEFAULT FALSE,
    is_significant_drop BOOLEAN DEFAULT FALSE,
    deal_type VARCHAR(20),
    drop_level VARCHAR(10) DEFAULT 'normal',
    property_type SMALLINT DEFAULT 1,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_txn_region_date ON apt_transactions(region_code, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_txn_trade_date ON apt_transactions(trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_txn_change_rate ON apt_transactions(change_rate ASC) WHERE change_rate IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_txn_property_type ON apt_transactions(property_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_txn_unique ON apt_transactions(apt_name, size_sqm, floor, trade_date, trade_price);

CREATE TABLE IF NOT EXISTS finance_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_type VARCHAR(50) NOT NULL,
    rate_value DECIMAL(5,3) NOT NULL,
    prev_value DECIMAL(5,3),
    change_bp INTEGER,
    base_date DATE NOT NULL,
    source VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rates_type_date ON finance_rates(rate_type, base_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rates_unique ON finance_rates(rate_type, base_date);

CREATE TABLE IF NOT EXISTS daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date DATE NOT NULL UNIQUE,
    title VARCHAR(300) NOT NULL,
    summary TEXT,
    top_drops JSONB,
    top_highs JSONB,
    rate_summary JSONB,
    volume_summary JSONB,
    og_image_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS page_views (
    id INT8 PRIMARY KEY DEFAULT unique_rowid(),
    page_path VARCHAR(500) NOT NULL,
    page_type VARCHAR(50),
    region_code VARCHAR(10),
    complex_id UUID REFERENCES apt_complexes(id),
    view_date DATE NOT NULL DEFAULT CURRENT_DATE,
    view_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_views_path_date ON page_views(page_path, view_date);

CREATE TABLE IF NOT EXISTS content_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date DATE NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    storage_urls TEXT[] NOT NULL,
    caption TEXT,
    hashtags TEXT[],
    status VARCHAR(20) NOT NULL DEFAULT 'ready',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_content_queue_unique ON content_queue(report_date, content_type);

CREATE TABLE IF NOT EXISTS seeding_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date DATE NOT NULL,
    platform VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    link VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seeding_queue_unique ON seeding_queue(report_date, platform);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
