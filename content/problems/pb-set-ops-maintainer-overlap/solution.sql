WITH mit AS (
  SELECT pm.maintainer_id
  FROM package_maintainers pm
  JOIN packages p ON p.id = pm.package_id
  WHERE p.license = 'MIT'
),
undeclared AS (
  SELECT pm.maintainer_id
  FROM package_maintainers pm
  JOIN packages p ON p.id = pm.package_id
  WHERE p.license IS NULL
),
buckets AS (
  SELECT maintainer_id, 'both' AS bucket
  FROM (SELECT * FROM mit INTERSECT SELECT * FROM undeclared)
  UNION ALL
  SELECT maintainer_id, 'mit-only'
  FROM (SELECT * FROM mit EXCEPT SELECT * FROM undeclared)
  UNION ALL
  SELECT maintainer_id, 'undeclared-only'
  FROM (SELECT * FROM undeclared EXCEPT SELECT * FROM mit)
)
SELECT m.handle, b.bucket
FROM buckets b
JOIN maintainers m ON m.id = b.maintainer_id;
