-- Topological layers of the created_at-oriented shared-maintainer DAG.
-- This takes the SMALLEST depth at which each package is reachable, which is
-- the earliest a source could get to it, not the layer it belongs in.
WITH RECURSIVE dag AS (
  SELECT DISTINCT a.package_id AS src, b.package_id AS dst
  FROM package_maintainers a
  JOIN package_maintainers b ON a.maintainer_id = b.maintainer_id
  JOIN packages p ON p.id = a.package_id
  JOIN packages q ON q.id = b.package_id
  WHERE p.created_at < q.created_at
),
layer(node, depth) AS (
  SELECT p.id, 0
  FROM packages p
  WHERE NOT EXISTS (SELECT 1 FROM dag d WHERE d.dst = p.id)
  UNION
  SELECT d.dst, l.depth + 1
  FROM layer l JOIN dag d ON d.src = l.node
  WHERE l.depth < 20
)
SELECT p.name AS name, min(l.depth) AS build_layer
FROM layer l JOIN packages p ON p.id = l.node
GROUP BY p.name
ORDER BY build_layer, name;
