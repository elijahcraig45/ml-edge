SELECT m.handle, m.joined_at
FROM maintainers m
WHERE NOT EXISTS (
  SELECT 1 FROM package_maintainers pm
  WHERE pm.maintainer_id = m.id
    AND pm.role = 'owner'
);
