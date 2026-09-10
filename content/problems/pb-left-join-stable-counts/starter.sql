-- Stable (non-prerelease) release count for every package.
-- The filter is in WHERE, so the five packages that have only ever shipped
-- prereleases disappear instead of showing a zero.
SELECT p.name, count(*) AS stable_versions
FROM packages p
LEFT JOIN versions v ON v.package_id = p.id
WHERE NOT v.is_prerelease
GROUP BY p.name;
