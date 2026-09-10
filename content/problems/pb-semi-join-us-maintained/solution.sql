SELECT p.name, p.language
FROM packages p
WHERE EXISTS (
  SELECT 1
  FROM package_maintainers pm
  JOIN maintainers m ON m.id = pm.maintainer_id
  WHERE pm.package_id = p.id
    AND m.country = 'US'
);
