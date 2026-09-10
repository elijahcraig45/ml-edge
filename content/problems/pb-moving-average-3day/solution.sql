SELECT
  package_id,
  day,
  count,
  round(avg(count) OVER w, 2) AS ma3,
  count(*) OVER w             AS window_days
FROM downloads
WINDOW w AS (
  PARTITION BY package_id
  ORDER BY day
  ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
);
