-- Downloads per release, by language.
-- This joins three tables at three different grains, so downloads and releases
-- multiply each other. It runs. Every number in it is wrong.
SELECT
  p.language,
  sum(d.count) AS downloads,
  count(*)     AS releases,
  round(sum(d.count) / count(*), 2) AS downloads_per_release
FROM packages p
JOIN downloads d ON d.package_id = p.id
JOIN versions  v ON v.package_id = p.id
GROUP BY p.language
ORDER BY p.language;
