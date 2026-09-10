SELECT
  p.language,
  count(DISTINCT d."count")                                       AS exact_distinct,
  approx_count_distinct(d."count")                                AS approx_distinct,
  abs(approx_count_distinct(d."count") - count(DISTINCT d."count")) AS abs_error
FROM downloads d
JOIN packages p ON p.id = d.package_id
GROUP BY p.language
ORDER BY p.language;
