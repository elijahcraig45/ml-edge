-- Packages with at least one US-based maintainer.
-- This emits one row per matching maintainer, so chunker appears three times.
SELECT p.name, p.language
FROM packages p
JOIN package_maintainers pm ON pm.package_id = p.id
JOIN maintainers m ON m.id = pm.maintainer_id
WHERE m.country = 'US';
