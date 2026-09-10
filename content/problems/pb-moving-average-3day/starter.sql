-- Three-day trailing average of each package's downloads.
-- ORDER BY inside OVER installs a default frame of RANGE UNBOUNDED PRECEDING,
-- so this is a cumulative average: by day ten the window holds ten rows.
SELECT
  package_id,
  day,
  count,
  round(avg(count) OVER w, 2) AS ma3,
  count(*) OVER w             AS window_days
FROM downloads
WINDOW w AS (PARTITION BY package_id ORDER BY day);
