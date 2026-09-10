WITH RECURSIVE
edge AS (
  SELECT DISTINCT a.package_id AS p, b.package_id AS q
  FROM package_maintainers a
  JOIN package_maintainers b
    ON a.maintainer_id = b.maintainer_id AND a.package_id <> b.package_id
),
walk(id, hops) AS (
  SELECT 1, 0
  UNION
  SELECT e.q, w.hops + 1
  FROM walk w
  JOIN edge e ON e.p = w.id
  WHERE w.hops < 19
)
SELECT p.name, min(w.hops) AS hops
FROM walk w
JOIN packages p ON p.id = w.id
GROUP BY p.name
ORDER BY hops, name;
