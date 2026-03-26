-- Run against production DB: psql $DATABASE_URL -f scripts/migrate-pg-trgm.sql

-- Enable pg_trgm extension for trigram-based GIN indexes
-- Required for ILIKE queries to use index scans instead of sequential scans
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index on apt_name for ILIKE '%keyword%' search acceleration
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apt_complexes_apt_name_trgm
  ON apt_complexes USING GIN (apt_name gin_trgm_ops);

-- GIN index on region_name for ILIKE '%keyword%' search acceleration
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apt_complexes_region_name_trgm
  ON apt_complexes USING GIN (region_name gin_trgm_ops);

-- GIN index on dong_name for ILIKE '%keyword%' search acceleration
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apt_complexes_dong_name_trgm
  ON apt_complexes USING GIN (dong_name gin_trgm_ops);

-- Verification query (uncomment to test after migration):
-- EXPLAIN ANALYZE SELECT * FROM apt_complexes WHERE apt_name ILIKE '%래미안%';
