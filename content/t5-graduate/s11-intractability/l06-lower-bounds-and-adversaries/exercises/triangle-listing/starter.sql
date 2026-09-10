-- Every closed triple in the co-maintainer graph.
-- Each triangle comes back six times: once per way of walking its three
-- vertices. 102 rows for 17 triangles.
WITH edge AS (
  SELECT DISTINCT a.package_id AS x, b.package_id AS y
  FROM package_maintainers a
  JOIN package_maintainers b
    ON a.maintainer_id = b.maintainer_id AND a.package_id <> b.package_id
)
SELECT
  pa.name AS a,
  pb.name AS b,
  pc.name AS c
FROM edge r
JOIN edge s ON s.x = r.y
JOIN edge t ON t.x = s.y AND t.y = r.x
JOIN packages pa ON pa.id = r.x
JOIN packages pb ON pb.id = r.y
JOIN packages pc ON pc.id = s.y
ORDER BY a, b, c;
