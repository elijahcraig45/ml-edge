SELECT
  package_id,
  day,
  count,
  sum(count) OVER (
    ORDER BY day
    RANGE BETWEEN INTERVAL 2 DAY PRECEDING AND CURRENT ROW
  ) AS trailing_3day
FROM downloads;
