SELECT
  p.name,
  count(*)                                   AS maintainers,
  rank()       OVER (ORDER BY count(*) DESC) AS rank_pos,
  dense_rank() OVER (ORDER BY count(*) DESC) AS dense_pos
FROM packages p
JOIN package_maintainers pm ON pm.package_id = p.id
GROUP BY p.name;
