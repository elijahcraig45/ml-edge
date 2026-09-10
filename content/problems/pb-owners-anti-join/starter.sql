-- Maintainers who own no package at all.
-- This finds maintainers who have a *contributor* row, which is a different
-- question: five of these people own something as well.
SELECT DISTINCT m.handle, m.joined_at
FROM maintainers m
LEFT JOIN package_maintainers pm ON pm.maintainer_id = m.id
WHERE pm.role <> 'owner';
