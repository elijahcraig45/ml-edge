WITH edges AS (
  SELECT DISTINCT a.package_id AS src, b.package_id AS dst
  FROM package_maintainers a
  JOIN package_maintainers b ON a.maintainer_id = b.maintainer_id
  WHERE a.package_id <> b.package_id
)
SELECT
  p.name                                        AS name,
  count(*)                                      AS degree,
  string_agg(q.name, ', ' ORDER BY q.name)      AS neighbours
FROM edges e
JOIN packages p ON p.id = e.src
JOIN packages q ON q.id = e.dst
GROUP BY p.name
ORDER BY degree DESC, name;
