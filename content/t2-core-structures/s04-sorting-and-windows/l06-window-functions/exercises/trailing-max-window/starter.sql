-- Five-day trailing maximum per package.
-- This runs, returns 200 rows, and is wrong on 38 of them: with no frame the
-- window reaches all the way back to the start of the partition.
SELECT package_id, day, count,
       max(count) OVER (PARTITION BY package_id ORDER BY day) AS max_5d
FROM downloads
ORDER BY package_id, day;
