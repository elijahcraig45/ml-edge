-- Maintainers of at least one Python package, one row each.
-- This version emits one row per (maintainer, python package) pair, so
-- anyone who maintains several of them appears several times.
SELECT m.handle
FROM maintainers m
JOIN package_maintainers pm ON pm.maintainer_id = m.id
JOIN packages p ON p.id = pm.package_id
WHERE p.language = 'python'
ORDER BY m.handle;
