-- Packages sharing a maintainer with arrowkit, plus arrowkit itself.
-- This is one hop only. dagrun, indexer and quickselect are two hops away and
-- are missing entirely.
WITH edge AS (
  SELECT DISTINCT a.package_id AS p, b.package_id AS q
  FROM package_maintainers a
  JOIN package_maintainers b
    ON a.maintainer_id = b.maintainer_id AND a.package_id <> b.package_id
)
SELECT p.name, 1 AS hops
FROM edge e
JOIN packages p ON p.id = e.q
WHERE e.p = 1
UNION ALL
SELECT 'arrowkit', 0
ORDER BY hops, name;
