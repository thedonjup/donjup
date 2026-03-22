-- donjup-rent 프로젝트 초기 스키마
CREATE TABLE apt_rent_transactions (
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
CREATE INDEX idx_rent_region_date ON apt_rent_transactions(region_code, trade_date DESC);
CREATE UNIQUE INDEX idx_rent_unique ON apt_rent_transactions(apt_name, size_sqm, floor, trade_date, deposit, monthly_rent);
ALTER TABLE apt_rent_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON apt_rent_transactions FOR SELECT USING (true);

CREATE TABLE reb_price_indices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index_type VARCHAR(50) NOT NULL,
    region_name VARCHAR(100) NOT NULL,
    index_value DECIMAL(8,2) NOT NULL,
    base_date DATE NOT NULL,
    prev_value DECIMAL(8,2),
    change_rate DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_reb_unique ON reb_price_indices(index_type, region_name, base_date);
CREATE INDEX idx_reb_type_date ON reb_price_indices(index_type, base_date DESC);
ALTER TABLE reb_price_indices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON reb_price_indices FOR SELECT USING (true);
