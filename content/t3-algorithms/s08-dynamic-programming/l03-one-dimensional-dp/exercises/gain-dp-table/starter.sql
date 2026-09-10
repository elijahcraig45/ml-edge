-- The last column is today's gain, not the best gain so far.
-- Watch what it does on the day the price collapses.
SELECT day,
       count AS downloads,
       min(count) OVER (ORDER BY day ROWS UNBOUNDED PRECEDING) AS cheapest_so_far,
       count - min(count) OVER (ORDER BY day ROWS UNBOUNDED PRECEDING) AS best_gain_so_far
FROM downloads
WHERE package_id = 13
ORDER BY day;
