-- ================================================
-- DonJup(돈줍) Database Schema
-- Supabase SQL Editor에서 실행
-- ================================================

-- 1. 아파트 단지 마스터
CREATE TABLE apt_complexes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_code     VARCHAR(10) NOT NULL,
    region_name     VARCHAR(100) NOT NULL,
    dong_name       VARCHAR(50),
    apt_name        VARCHAR(200) NOT NULL,
    address         VARCHAR(300),
    total_units     INTEGER,
    built_year      INTEGER,
    slug            VARCHAR(200) NOT NULL UNIQUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_complexes_region ON apt_complexes(region_code);
CREATE INDEX idx_complexes_name ON apt_complexes(apt_name);

-- 2. 아파트 실거래가
CREATE TABLE apt_transactions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complex_id            UUID REFERENCES apt_complexes(id),
    region_code           VARCHAR(10) NOT NULL,
    region_name           VARCHAR(100) NOT NULL,
    apt_name              VARCHAR(200) NOT NULL,
    size_sqm              DECIMAL(6,2) NOT NULL,
    floor                 INTEGER,
    trade_price           BIGINT NOT NULL,
    trade_date            DATE NOT NULL,
    highest_price         BIGINT,
    change_rate           DECIMAL(5,2),
    is_new_high           BOOLEAN DEFAULT FALSE,
    is_significant_drop   BOOLEAN DEFAULT FALSE,
    raw_data              JSONB,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_txn_region_date ON apt_transactions(region_code, trade_date DESC);
CREATE INDEX idx_txn_complex ON apt_transactions(complex_id);
CREATE INDEX idx_txn_trade_date ON apt_transactions(trade_date DESC);
CREATE INDEX idx_txn_significant ON apt_transactions(is_significant_drop, is_new_high)
    WHERE is_significant_drop = TRUE OR is_new_high = TRUE;
CREATE INDEX idx_txn_change_rate ON apt_transactions(change_rate ASC)
    WHERE change_rate IS NOT NULL;

-- 중복 거래 방지용 유니크 인덱스
CREATE UNIQUE INDEX idx_txn_unique ON apt_transactions(
    apt_name, size_sqm, floor, trade_date, trade_price
);

-- 3. 금리 지표
CREATE TABLE finance_rates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_type       VARCHAR(50) NOT NULL,
    rate_value      DECIMAL(5,3) NOT NULL,
    prev_value      DECIMAL(5,3),
    change_bp       INTEGER,
    base_date       DATE NOT NULL,
    source          VARCHAR(50) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rates_type_date ON finance_rates(rate_type, base_date DESC);
CREATE UNIQUE INDEX idx_rates_unique ON finance_rates(rate_type, base_date);

-- 4. 데일리 리포트
CREATE TABLE daily_reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date     DATE NOT NULL UNIQUE,
    title           VARCHAR(300) NOT NULL,
    summary         TEXT,
    top_drops       JSONB,
    top_highs       JSONB,
    rate_summary    JSONB,
    volume_summary  JSONB,
    og_image_url    VARCHAR(500),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_reports_date ON daily_reports(report_date DESC);

-- 5. 조회수 로그
CREATE TABLE page_views (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    page_path       VARCHAR(500) NOT NULL,
    page_type       VARCHAR(50),
    region_code     VARCHAR(10),
    complex_id      UUID REFERENCES apt_complexes(id),
    view_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    view_count      INTEGER DEFAULT 1,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_views_path_date ON page_views(page_path, view_date);
CREATE INDEX idx_views_region_date ON page_views(region_code, view_date DESC)
    WHERE region_code IS NOT NULL;
CREATE INDEX idx_views_complex ON page_views(complex_id, view_date DESC)
    WHERE complex_id IS NOT NULL;

-- ================================================
-- Row Level Security (RLS)
-- ================================================

ALTER TABLE apt_complexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE apt_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- 공개 읽기
CREATE POLICY "Public read" ON apt_complexes FOR SELECT USING (true);
CREATE POLICY "Public read" ON apt_transactions FOR SELECT USING (true);
CREATE POLICY "Public read" ON finance_rates FOR SELECT USING (true);
CREATE POLICY "Public read" ON daily_reports FOR SELECT USING (true);
CREATE POLICY "Public read" ON page_views FOR SELECT USING (true);

-- 조회수는 anon도 기록 가능
CREATE POLICY "Public insert" ON page_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update" ON page_views FOR UPDATE USING (true);

-- ================================================
-- 조회수 UPSERT 함수
-- ================================================

CREATE OR REPLACE FUNCTION increment_page_view(
    p_page_path VARCHAR,
    p_page_type VARCHAR DEFAULT NULL,
    p_region_code VARCHAR DEFAULT NULL,
    p_complex_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO page_views (page_path, page_type, region_code, complex_id, view_date, view_count)
    VALUES (p_page_path, p_page_type, p_region_code, p_complex_id, CURRENT_DATE, 1)
    ON CONFLICT (page_path, view_date)
    DO UPDATE SET view_count = page_views.view_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
