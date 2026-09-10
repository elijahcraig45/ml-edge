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
JOIN edge t ON t.x = r.x AND t.y = s.y
JOIN packages pa ON pa.id = r.x
JOIN packages pb ON pb.id = r.y
JOIN packages pc ON pc.id = s.y
WHERE r.x < r.y AND r.y < s.y
ORDER BY a, b, c;
