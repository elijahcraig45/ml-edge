SELECT package_id, day, count,
       max(count) OVER (
         PARTITION BY package_id
         ORDER BY day
         ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
       ) AS max_5d
FROM downloads
ORDER BY package_id, day;
