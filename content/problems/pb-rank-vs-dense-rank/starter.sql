-- Packages ranked by maintainer count.
-- row_number() breaks the ties arbitrarily, so it reports 1..20 and hides the
-- fact that five packages are tied at the top.
SELECT
  p.name,
  count(*)                                   AS maintainers,
  row_number() OVER (ORDER BY count(*) DESC) AS rank_pos,
  row_number() OVER (ORDER BY count(*) DESC) AS dense_pos
FROM packages p
JOIN package_maintainers pm ON pm.package_id = p.id
GROUP BY p.name;
