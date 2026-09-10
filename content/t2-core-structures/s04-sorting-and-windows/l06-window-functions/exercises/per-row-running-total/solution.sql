SELECT day, package_id, count,
       sum(count) OVER (
         ORDER BY day, package_id
         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS running_total
FROM downloads
ORDER BY day, package_id;
