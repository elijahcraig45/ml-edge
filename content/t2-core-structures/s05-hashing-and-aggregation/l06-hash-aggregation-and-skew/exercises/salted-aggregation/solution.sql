WITH events AS (
  SELECT d.package_id, d.day, e.i AS event_no
  FROM downloads d, range(d.count) e(i)
),
partial AS (
  SELECT package_id, event_no % 8 AS salt, count(*) AS partial_count
  FROM events
  GROUP BY package_id, salt
)
SELECT package_id, sum(partial_count) AS downloads
FROM partial
GROUP BY package_id
ORDER BY package_id;
