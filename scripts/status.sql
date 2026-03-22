SELECT
  (SELECT count(*) FROM apt_transactions) as trade_count,
  (SELECT count(*) FROM apt_complexes) as complex_count,
  (SELECT count(*) FROM apt_rent_transactions) as rent_count,
  (SELECT pg_size_pretty(pg_database_size('postgres'))) as db_size;
