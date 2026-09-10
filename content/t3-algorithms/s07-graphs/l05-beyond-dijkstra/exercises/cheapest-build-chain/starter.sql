-- Cheapest chain of packages to pull in, starting from 'indexer'.
-- This only looks one step ahead, and it reports the step cost rather than
-- the running total.
WITH weight AS (
  SELECT package_id, max(size_kb) AS kb FROM versions GROUP BY package_id
),
dag AS (
  SELECT DISTINCT a.package_id AS src, b.package_id AS dst, w.kb AS cost
  FROM package_maintainers a
  JOIN package_maintainers b ON a.maintainer_id = b.maintainer_id
  JOIN packages p ON p.id = a.package_id
  JOIN packages q ON q.id = b.package_id
  JOIN weight w ON w.package_id = b.package_id
  WHERE p.created_at < q.created_at
)
SELECT q.name AS name, d.cost AS cheapest_kb
FROM dag d
JOIN packages p ON p.id = d.src
JOIN packages q ON q.id = d.dst
WHERE p.name = 'indexer'
ORDER BY cheapest_kb, name;
