-- 1단계: 각 거래의 최고가를 시간순 누적 MAX로 계산
-- apt_name + size_sqm 조합별로 trade_date 순서대로 누적 최고가 계산
WITH ranked AS (
  SELECT
    id,
    apt_name,
    size_sqm,
    trade_price,
    trade_date,
    MAX(trade_price) OVER (
      PARTITION BY apt_name, size_sqm
      ORDER BY trade_date, id
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ) AS prev_highest
  FROM apt_transactions
)
UPDATE apt_transactions t
SET
  highest_price = GREATEST(COALESCE(r.prev_highest, 0), t.trade_price),
  change_rate = CASE
    WHEN r.prev_highest IS NOT NULL AND r.prev_highest > 0 AND t.trade_price < r.prev_highest
    THEN ROUND(((t.trade_price - r.prev_highest)::numeric / r.prev_highest) * 100, 2)
    WHEN r.prev_highest IS NOT NULL AND r.prev_highest > 0 AND t.trade_price > r.prev_highest
    THEN NULL
    ELSE NULL
  END,
  is_new_high = CASE
    WHEN r.prev_highest IS NOT NULL AND r.prev_highest > 0 AND t.trade_price > r.prev_highest
    THEN true
    ELSE false
  END,
  is_significant_drop = CASE
    WHEN r.prev_highest IS NOT NULL AND r.prev_highest > 0
      AND ROUND(((t.trade_price - r.prev_highest)::numeric / r.prev_highest) * 100, 2) <= -20
    THEN true
    ELSE false
  END
FROM ranked r
WHERE t.id = r.id;
