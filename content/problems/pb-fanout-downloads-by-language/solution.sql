SELECT
  p.language,
  count(DISTINCT p.id) AS packages,
  sum(d.count)         AS total_downloads
FROM packages p
JOIN downloads d ON d.package_id = p.id
GROUP BY p.language;
