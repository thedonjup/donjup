SELECT apt_name, size_sqm, floor, trade_price, trade_date, highest_price, change_rate, is_new_high
FROM apt_transactions
WHERE region_code = '11350' AND apt_name LIKE '%벽산%'
ORDER BY trade_price DESC
LIMIT 30;
