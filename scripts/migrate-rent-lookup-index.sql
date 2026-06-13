DROP INDEX IF EXISTS apt_rent_transactions@idx_rent_unique;

CREATE INDEX IF NOT EXISTS idx_rent_lookup ON apt_rent_transactions(
  apt_name,
  size_sqm,
  floor,
  trade_date,
  deposit,
  monthly_rent
);
