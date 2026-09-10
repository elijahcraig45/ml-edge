-- Total downloads per package. Now keep only the heavy hitters,
-- and report each one's share of the whole.
SELECT
  p.name,
  sum(d."count") AS total_downloads
FROM downloads d
JOIN packages p ON p.id = d.package_id
GROUP BY p.name
ORDER BY total_downloads DESC;
