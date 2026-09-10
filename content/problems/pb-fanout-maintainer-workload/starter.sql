-- Workload for maintainers who look after two or more packages.
-- versions and downloads are siblings under packages, so joining both in one
-- FROM clause pairs every release with every download day. Grace's size comes
-- out 10x too high and her downloads 2.5x too high.
SELECT
  m.handle,
  count(DISTINCT pm.package_id) AS packages,
  sum(v.size_kb)                AS total_size_kb,
  sum(d.count)                  AS total_downloads
FROM maintainers m
JOIN package_maintainers pm ON pm.maintainer_id = m.id
JOIN versions v  ON v.package_id = pm.package_id
JOIN downloads d ON d.package_id = pm.package_id
GROUP BY m.handle
HAVING count(DISTINCT pm.package_id) >= 2;
