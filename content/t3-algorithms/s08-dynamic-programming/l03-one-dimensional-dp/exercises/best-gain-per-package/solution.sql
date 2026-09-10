WITH running AS (
  SELECT package_id,
         count,
         min(count) OVER (PARTITION BY package_id
                          ORDER BY day
                          ROWS UNBOUNDED PRECEDING) AS cheapest_so_far
  FROM downloads
)
SELECT p.name,
       max(r.count - r.cheapest_so_far) AS best_gain
FROM running r
JOIN packages p ON p.id = r.package_id
GROUP BY p.name
ORDER BY best_gain DESC, p.name;
