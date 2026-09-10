-- Maintainers who have never been an owner of anything.
-- This version answers a different question: "maintainers who hold a
-- non-owner role somewhere", which is not the same set at all.
SELECT DISTINCT m.handle, m.country
FROM maintainers m
JOIN package_maintainers pm ON pm.maintainer_id = m.id
WHERE pm.role <> 'owner'
ORDER BY m.handle;
