-- Registry-wide running total, attached to every download row.
-- ROWS counts physical rows, and twenty rows share each day, so this gives
-- 200 different running totals in an order the engine chose arbitrarily.
SELECT
  package_id,
  day,
  count,
  sum(count) OVER (
    ORDER BY day
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS registry_to_date
FROM downloads;
