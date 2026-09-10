-- Six releases over 200 KB, largest first.
-- The rows are already right. The plan is not: press Explain and look for
-- CTE_SCAN, and the FILTER sitting above it.
WITH release_sizes AS MATERIALIZED (
  SELECT p.name AS package, v.version, v.size_kb
  FROM packages p
  JOIN versions v ON v.package_id = p.id
)
SELECT package, version, size_kb
FROM release_sizes
WHERE size_kb > 200
ORDER BY size_kb DESC;
