SELECT p.language, sum(d.count) AS total_downloads
FROM packages p
JOIN downloads d ON d.package_id = p.id
WHERE EXISTS (
  SELECT 1
  FROM package_maintainers pm
  JOIN maintainers m ON m.id = pm.maintainer_id
  WHERE pm.package_id = p.id
    AND m.country = 'US'
)
GROUP BY p.language
ORDER BY p.language;
