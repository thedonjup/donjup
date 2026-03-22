SELECT apt_name, size_sqm, floor, trade_price, trade_date, highest_price, change_rate, is_new_high, is_significant_drop
FROM apt_transactions
WHERE region_code = '11350' AND apt_name LIKE '%벽산%'
ORDER BY trade_date DESC
LIMIT 10;
