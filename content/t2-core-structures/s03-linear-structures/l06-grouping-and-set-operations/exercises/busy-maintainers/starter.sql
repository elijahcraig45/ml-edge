-- Maintainers attached to three or more packages.
-- This groups correctly and then forgets to drop the small teams, so it
-- returns every maintainer. `WHERE count(*) >= 3` will not work: WHERE runs
-- before the grouping, so the count does not exist yet.
SELECT
  m.handle,
  count(*) AS package_count
FROM maintainers m
JOIN package_maintainers pm ON pm.maintainer_id = m.id
GROUP BY m.handle
ORDER BY package_count DESC, m.handle;
