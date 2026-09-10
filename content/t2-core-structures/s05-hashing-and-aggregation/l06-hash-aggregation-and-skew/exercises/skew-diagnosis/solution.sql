WITH events AS (
  SELECT d.package_id, d.day, e.i AS event_no
  FROM downloads d, range(d.count) e(i)
),
per_key AS (
  SELECT package_id, count(*) AS events
  FROM events
  GROUP BY package_id
)
SELECT
  count(*)                                         AS groups,
  sum(events)                                      AS total_events,
  max(events)                                      AS largest_group,
  round(100.0 * max(events) / sum(events), 2)      AS largest_share_pct,
  round(max(events) / (sum(events) / count(*)), 2) AS skew_ratio
FROM per_key;
