-- How many buckets hold 0 packages, 1 package, 2 packages, ...?
-- This version can only see buckets that already contain something.
WITH bucket_of AS (
  SELECT hash(name) % 8 AS bucket, count(*) AS bucket_load
  FROM packages
  GROUP BY bucket
)
SELECT bucket_load, count(*) AS bucket_count
FROM bucket_of
GROUP BY bucket_load
ORDER BY bucket_load;
