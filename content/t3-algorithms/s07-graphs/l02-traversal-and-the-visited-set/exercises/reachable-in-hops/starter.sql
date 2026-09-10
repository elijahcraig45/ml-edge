-- Reachability from 'graphwalk' through the shared-maintainer graph.
-- This only finds the packages one hop away. Make it recursive.
WITH edges AS (
  SELECT DISTINCT a.package_id AS src, b.package_id AS dst
  FROM package_maintainers a
  JOIN package_maintainers b ON a.maintainer_id = b.maintainer_id
  WHERE a.package_id <> b.package_id
)
SELECT p.name AS name, 1 AS hops
FROM edges e
JOIN packages src ON src.id = e.src
JOIN packages p ON p.id = e.dst
WHERE src.name = 'graphwalk'
ORDER BY hops, name;
