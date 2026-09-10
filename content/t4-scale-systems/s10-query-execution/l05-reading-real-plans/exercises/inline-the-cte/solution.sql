WITH release_sizes AS (
  SELECT p.name AS package, v.version, v.size_kb
  FROM packages p
  JOIN versions v ON v.package_id = p.id
)
SELECT package, version, size_kb
FROM release_sizes
WHERE size_kb > 200
ORDER BY size_kb DESC;
