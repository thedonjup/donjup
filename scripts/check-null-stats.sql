SELECT
  count(*) as total,
  count(*) FILTER (WHERE highest_price IS NULL) as null_highest,
  count(*) FILTER (WHERE change_rate IS NULL AND highest_price IS NULL) as null_both,
  count(*) FILTER (WHERE highest_price IS NOT NULL) as has_highest,
  count(*) FILTER (WHERE change_rate IS NOT NULL) as has_change_rate
FROM apt_transactions;
