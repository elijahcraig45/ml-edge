SELECT m.handle
FROM maintainers m
WHERE EXISTS (
  SELECT 1
  FROM package_maintainers pm
  JOIN packages p ON p.id = pm.package_id
  WHERE pm.maintainer_id = m.id
    AND p.language = 'python'
)
ORDER BY m.handle;
