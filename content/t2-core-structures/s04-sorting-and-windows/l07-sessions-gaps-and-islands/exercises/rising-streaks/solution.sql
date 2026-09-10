WITH deltas AS (
  SELECT package_id, day,
         count - lag(count) OVER (PARTITION BY package_id ORDER BY day) AS change
  FROM downloads
),
rising AS (
  SELECT package_id, day FROM deltas WHERE change > 0
),
flagged AS (
  SELECT package_id, day,
         CASE WHEN day - lag(day) OVER (PARTITION BY package_id ORDER BY day) = 1
              THEN 0 ELSE 1 END AS starts_run
  FROM rising
),
numbered AS (
  SELECT package_id, day,
         sum(starts_run) OVER (PARTITION BY package_id ORDER BY day
                               ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS run_id
  FROM flagged
),
runs AS (
  SELECT package_id, run_id, count(*) AS days
  FROM numbered GROUP BY package_id, run_id
)
SELECT package_id, max(days) AS longest_rising_run
FROM runs
GROUP BY package_id
ORDER BY package_id;
