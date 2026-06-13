-- Pageview analytics indexes used by /api/analytics/pageview and popular-page queries.
-- Run once before relying on ON CONFLICT(page_path, view_date) in production.

WITH duplicate_groups AS (
  SELECT
    page_path,
    view_date,
    MIN(id) AS keep_id,
    SUM(view_count) AS total_count,
    MAX(page_type) AS page_type
  FROM page_views
  GROUP BY page_path, view_date
  HAVING COUNT(*) > 1
),
updated AS (
  UPDATE page_views pv
  SET
    view_count = dg.total_count,
    page_type = COALESCE(pv.page_type, dg.page_type)
  FROM duplicate_groups dg
  WHERE pv.id = dg.keep_id
  RETURNING pv.id
)
DELETE FROM page_views pv
USING duplicate_groups dg
WHERE pv.page_path = dg.page_path
  AND pv.view_date = dg.view_date
  AND pv.id <> dg.keep_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_views_path_date
  ON page_views(page_path, view_date);

CREATE INDEX IF NOT EXISTS idx_views_type_date
  ON page_views(page_type, view_date DESC)
  WHERE page_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_views_region_date
  ON page_views(region_code, view_date DESC)
  WHERE region_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_views_complex
  ON page_views(complex_id, view_date DESC)
  WHERE complex_id IS NOT NULL;
