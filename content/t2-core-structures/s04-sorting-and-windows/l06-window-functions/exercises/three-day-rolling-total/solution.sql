SELECT day, package_id, count,
       sum(count) OVER (
         ORDER BY day
         RANGE BETWEEN 2 PRECEDING AND CURRENT ROW
       ) AS rolling_3d
FROM downloads
ORDER BY day, package_id;
