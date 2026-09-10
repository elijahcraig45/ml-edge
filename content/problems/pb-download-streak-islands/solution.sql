WITH busy AS (
  SELECT
    package_id,
    day,
    row_number() OVER (PARTITION BY package_id ORDER BY day) AS seq
  FROM downloads
  WHERE count >= 1000
)
SELECT
  package_id,
  min(day) AS first_day,
  max(day) AS last_day,
  count(*) AS days
FROM busy
GROUP BY package_id, day - INTERVAL (seq) DAY;
