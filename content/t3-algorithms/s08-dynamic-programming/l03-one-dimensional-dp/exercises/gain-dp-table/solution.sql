WITH running AS (
  SELECT day,
         count,
         min(count) OVER (ORDER BY day ROWS UNBOUNDED PRECEDING) AS cheapest_so_far
  FROM downloads
  WHERE package_id = 13
)
SELECT day,
       count AS downloads,
       cheapest_so_far,
       max(count - cheapest_so_far) OVER (ORDER BY day
                                          ROWS UNBOUNDED PRECEDING) AS best_gain_so_far
FROM running
ORDER BY day;
