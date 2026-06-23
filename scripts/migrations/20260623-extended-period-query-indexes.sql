CREATE INDEX IF NOT EXISTS idx_txn_region_property_date
  ON apt_transactions(region_code, property_type, trade_date DESC);

CREATE INDEX IF NOT EXISTS idx_txn_region_property_change_date
  ON apt_transactions(region_code, property_type, change_rate ASC, trade_date DESC)
  WHERE change_rate IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_txn_region_property_new_high_date
  ON apt_transactions(region_code, property_type, is_new_high, trade_date DESC)
  WHERE is_new_high = true;

CREATE INDEX IF NOT EXISTS idx_rent_region_name_date
  ON apt_rent_transactions(region_code, apt_name, trade_date DESC);

CREATE INDEX IF NOT EXISTS idx_rent_complex_date
  ON apt_rent_transactions(complex_id, trade_date DESC)
  WHERE complex_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rent_identity_date
  ON apt_rent_transactions(identity_id, trade_date DESC)
  WHERE identity_id IS NOT NULL;
