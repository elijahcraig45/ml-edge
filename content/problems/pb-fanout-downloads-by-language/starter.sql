-- Downloads by implementation language.
-- Inherited from another dashboard, complete with a join to the maintainer
-- link table that nothing in the SELECT list actually uses. Python comes out
-- at 376,480 — more than the whole downloads table contains.
SELECT
  p.language,
  count(DISTINCT p.id) AS packages,
  sum(d.count)         AS total_downloads
FROM packages p
JOIN package_maintainers pm ON pm.package_id = p.id
JOIN downloads d ON d.package_id = p.id
GROUP BY p.language;
