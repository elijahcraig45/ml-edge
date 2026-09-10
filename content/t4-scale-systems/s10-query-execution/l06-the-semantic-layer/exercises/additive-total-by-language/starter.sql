-- Total downloads by language, for packages with a US-based maintainer.
-- This runs, returns the right shape, and inflates Python by 40%: chunker has
-- three US maintainers, so each of its download rows is counted three times.
SELECT p.language, sum(d.count) AS total_downloads
FROM packages p
JOIN package_maintainers pm ON pm.package_id = p.id
JOIN maintainers m ON m.id = pm.maintainer_id AND m.country = 'US'
JOIN downloads d ON d.package_id = p.id
GROUP BY p.language
ORDER BY p.language;
