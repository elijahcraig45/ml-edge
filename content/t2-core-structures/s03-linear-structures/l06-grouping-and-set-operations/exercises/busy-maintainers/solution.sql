SELECT
  m.handle,
  count(*) AS package_count
FROM maintainers m
JOIN package_maintainers pm ON pm.maintainer_id = m.id
GROUP BY m.handle
HAVING count(*) >= 3
ORDER BY package_count DESC, m.handle;
