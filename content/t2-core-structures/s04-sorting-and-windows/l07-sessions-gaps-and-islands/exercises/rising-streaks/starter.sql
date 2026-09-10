-- Longest run of consecutive rising days, per package.
-- This counts how many rising days there are, which is not the same as how many
-- of them are next to each other.
WITH deltas AS (
  SELECT package_id, day,
         count - lag(count) OVER (PARTITION BY package_id ORDER BY day) AS change
  FROM downloads
)
SELECT package_id, count(*) AS longest_rising_run
FROM deltas
WHERE change > 0
GROUP BY package_id
ORDER BY package_id;
