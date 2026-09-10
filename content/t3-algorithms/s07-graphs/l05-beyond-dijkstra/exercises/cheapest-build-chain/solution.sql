WITH RECURSIVE weight AS (
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
),
relax(node, total, hops) AS (
  SELECT id, 0, 0 FROM packages WHERE name = 'indexer'
  UNION
  SELECT d.dst, r.total + d.cost, r.hops + 1
  FROM relax r JOIN dag d ON d.src = r.node
  WHERE r.hops < 20
)
SELECT p.name AS name, min(r.total) AS cheapest_kb
FROM relax r JOIN packages p ON p.id = r.node
GROUP BY p.name
ORDER BY cheapest_kb, name;
