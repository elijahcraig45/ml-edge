-- The shared-maintainer graph as an adjacency list.
-- This version forgets that a self-join through a shared maintainer also
-- matches each package with itself, so every degree is one too high.
WITH edges AS (
  SELECT DISTINCT a.package_id AS src, b.package_id AS dst
  FROM package_maintainers a
  JOIN package_maintainers b ON a.maintainer_id = b.maintainer_id
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
