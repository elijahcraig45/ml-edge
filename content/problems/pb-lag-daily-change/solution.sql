SELECT
  package_id,
  day,
  count,
  lag(count)  OVER w        AS prev_count,
  count - lag(count) OVER w AS delta,
  lead(count) OVER w        AS next_count
FROM downloads
WINDOW w AS (PARTITION BY package_id ORDER BY day);
