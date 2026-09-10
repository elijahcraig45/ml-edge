WITH bucket_of AS (
  SELECT b.i AS bucket, count(p.id) AS bucket_load
  FROM range(8) b(i)
  LEFT JOIN packages p ON hash(p.name) % 8 = b.i
  GROUP BY b.i
)
SELECT bucket_load, count(*) AS bucket_count
FROM bucket_of
GROUP BY bucket_load
ORDER BY bucket_load;
