SELECT
  package_id,
  day,
  count,
  row_number() OVER w AS day_rank
FROM downloads
WINDOW w AS (PARTITION BY package_id ORDER BY count DESC)
QUALIFY day_rank <= 3;
