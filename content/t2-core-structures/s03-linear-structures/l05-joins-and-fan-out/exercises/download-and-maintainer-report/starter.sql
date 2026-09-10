-- Downloads and team size per package.
-- Joining downloads AND package_maintainers to the same packages row multiplies
-- the two child tables together, so every download row is repeated once per
-- maintainer. The maintainer_count is right; the totals are not.
SELECT
  p.name,
  sum(d.count) AS total_downloads,
  count(DISTINCT pm.maintainer_id) AS maintainer_count
FROM packages p
JOIN downloads d ON d.package_id = p.id
JOIN package_maintainers pm ON pm.package_id = p.id
GROUP BY p.name
ORDER BY total_downloads DESC, p.name;
