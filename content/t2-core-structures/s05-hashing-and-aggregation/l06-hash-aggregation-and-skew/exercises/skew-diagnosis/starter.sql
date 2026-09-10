-- A skew report for package_id. This one measures the wrong table: it counts
-- rows in the daily summary, where every package has exactly ten.
WITH per_key AS (
  SELECT package_id, count(*) AS events
  FROM downloads
  GROUP BY package_id
)
SELECT
  count(*)                                         AS groups,
  sum(events)                                      AS total_events,
  max(events)                                      AS largest_group,
  round(100.0 * max(events) / sum(events), 2)      AS largest_share_pct,
  round(max(events) / (sum(events) / count(*)), 2) AS skew_ratio
FROM per_key;
