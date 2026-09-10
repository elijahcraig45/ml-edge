SELECT m.handle, m.country
FROM maintainers m
WHERE NOT EXISTS (
  SELECT 1
  FROM package_maintainers pm
  WHERE pm.maintainer_id = m.id
    AND pm.role = 'owner'
)
ORDER BY m.handle;
