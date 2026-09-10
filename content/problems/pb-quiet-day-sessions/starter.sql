-- Sessions of consecutive quiet days per package.
-- No boundary detection at all: every quiet day of a package is folded into a
-- single session, so package 18's three sessions come back as one span that
-- covers days it was busy.
WITH quiet AS (
  SELECT package_id, day
  FROM (
    SELECT package_id, day, count,
           avg(count) OVER (PARTITION BY package_id) AS pkg_avg
    FROM downloads
  )
  WHERE count < pkg_avg
)
SELECT
  package_id,
  1        AS session_no,
  min(day) AS first_day,
  max(day) AS last_day,
  count(*) AS quiet_days
FROM quiet
GROUP BY package_id;
