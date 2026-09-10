-- Traffic estimate per package.
-- versions and downloads are joined into the same FROM clause, so each package
-- produces (releases x download-days) rows. count(DISTINCT ...) survives that;
-- the two SUMs do not.
SELECT
  p.name,
  count(v.id)         AS releases,
  sum(v.size_kb)      AS total_size_kb,
  sum(d.count)        AS total_downloads,
  count(DISTINCT d.day) AS download_days
FROM packages p
JOIN versions v  ON v.package_id = p.id
JOIN downloads d ON d.package_id = p.id
GROUP BY p.name;
