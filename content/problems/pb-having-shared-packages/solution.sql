SELECT
  p.name,
  count(*)                                        AS maintainers,
  count(*) FILTER (WHERE pm.role = 'owner')       AS owners,
  count(*) FILTER (WHERE pm.role = 'contributor') AS contributors
FROM packages p
JOIN package_maintainers pm ON pm.package_id = p.id
GROUP BY p.name
HAVING count(*) > 1;
