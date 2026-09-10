-- The naive single-phase aggregation. Correct, and every row for a hot key
-- lands on one task.
WITH events AS (
  SELECT d.package_id, d.day, e.i AS event_no
  FROM downloads d, range(d.count) e(i)
)
SELECT package_id, count(*) AS downloads
FROM events
GROUP BY package_id
ORDER BY package_id;
