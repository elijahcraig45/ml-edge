WITH quiet AS (
  SELECT package_id, day
  FROM (
    SELECT package_id, day, count,
           avg(count) OVER (PARTITION BY package_id) AS pkg_avg
    FROM downloads
  )
  WHERE count < pkg_avg
),
marked AS (
  SELECT
    package_id,
    day,
    CASE
      WHEN lag(day) OVER (PARTITION BY package_id ORDER BY day) = day - INTERVAL 1 DAY
      THEN 0 ELSE 1
    END AS starts_session
  FROM quiet
),
numbered AS (
  SELECT
    package_id,
    day,
    sum(starts_session) OVER (PARTITION BY package_id ORDER BY day) AS session_no
  FROM marked
)
SELECT
  package_id,
  session_no,
  min(day) AS first_day,
  max(day) AS last_day,
  count(*) AS quiet_days
FROM numbered
GROUP BY package_id, session_no;
