WITH RECURSIVE edges AS (
  SELECT DISTINCT a.package_id AS src, b.package_id AS dst
  FROM package_maintainers a
  JOIN package_maintainers b ON a.maintainer_id = b.maintainer_id
  WHERE a.package_id <> b.package_id
),
walk(node, depth) AS (
  SELECT id, 0 FROM packages WHERE name = 'graphwalk'
  UNION
  SELECT e.dst, w.depth + 1
  FROM walk w
  JOIN edges e ON e.src = w.node
  WHERE w.depth < 20
)
SELECT p.name AS name, min(w.depth) AS hops
FROM walk w
JOIN packages p ON p.id = w.node
GROUP BY p.name
ORDER BY hops, name;
