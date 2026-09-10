-- Maintainers who own something AND contribute to something else.
-- This asks for a single link row that is both roles at once, which no row
-- can be, so it returns nothing. The two conditions belong to two different
-- rows, and comparing two sets of rows is what a set operator is for.
SELECT DISTINCT m.handle
FROM maintainers m
JOIN package_maintainers pm ON pm.maintainer_id = m.id
WHERE pm.role = 'owner'
  AND pm.role = 'contributor'
ORDER BY m.handle;
