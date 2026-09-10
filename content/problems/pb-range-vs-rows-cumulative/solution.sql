SELECT
  package_id,
  day,
  count,
  sum(count) OVER (
    ORDER BY day
    RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS registry_to_date
FROM downloads;
