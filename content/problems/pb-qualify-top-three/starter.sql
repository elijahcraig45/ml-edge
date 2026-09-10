-- Each package's three best download days.
-- The window is not partitioned, so this ranks the whole registry and returns
-- the three busiest days overall -- all of them arrowkit's.
SELECT
  package_id,
  day,
  count,
  row_number() OVER w AS day_rank
FROM downloads
WINDOW w AS (ORDER BY count DESC)
QUALIFY day_rank <= 3;
