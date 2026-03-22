-- 1. 전월세 테이블
CREATE TABLE IF NOT EXISTS apt_rent_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_code VARCHAR(10) NOT NULL,
    region_name VARCHAR(100) NOT NULL,
    apt_name VARCHAR(200) NOT NULL,
    size_sqm DECIMAL(6,2) NOT NULL,
    floor INTEGER,
    deposit BIGINT NOT NULL,
    monthly_rent BIGINT DEFAULT 0,
    rent_type VARCHAR(10) NOT NULL,
    contract_type VARCHAR(20),
    trade_date DATE NOT NULL,
    pre_deposit BIGINT,
    pre_monthly_rent BIGINT,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rent_region_date ON apt_rent_transactions(region_code, trade_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rent_unique ON apt_rent_transactions(apt_name, size_sqm, floor, trade_date, deposit, monthly_rent);
ALTER TABLE apt_rent_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read rent" ON apt_rent_transactions FOR SELECT USING (true);

-- 2. 단지 컬럼 추가
ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS parking_count INTEGER;
ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS heating_method VARCHAR(50);
ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS floor_count INTEGER;

-- 3. 부동산원 가격지수
CREATE TABLE IF NOT EXISTS reb_price_indices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index_type VARCHAR(50) NOT NULL,
    region_name VARCHAR(100) NOT NULL,
    index_value DECIMAL(8,2) NOT NULL,
    base_date DATE NOT NULL,
    prev_value DECIMAL(8,2),
    change_rate DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reb_unique ON reb_price_indices(index_type, region_name, base_date);
CREATE INDEX IF NOT EXISTS idx_reb_type_date ON reb_price_indices(index_type, base_date DESC);
ALTER TABLE reb_price_indices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read reb" ON reb_price_indices FOR SELECT USING (true);

-- 4. 거래유형 컬럼 (이미 추가했을 수 있음)
ALTER TABLE apt_transactions ADD COLUMN IF NOT EXISTS deal_type VARCHAR(20);
