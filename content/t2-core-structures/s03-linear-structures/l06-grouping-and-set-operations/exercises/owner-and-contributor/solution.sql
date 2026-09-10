SELECT m.handle
FROM maintainers m
JOIN package_maintainers pm ON pm.maintainer_id = m.id
WHERE pm.role = 'owner'

INTERSECT

SELECT m.handle
FROM maintainers m
JOIN package_maintainers pm ON pm.maintainer_id = m.id
WHERE pm.role = 'contributor'

ORDER BY handle;
