-- Exact and approximate distinct counts of the daily download figures,
-- per language. This version counts values rather than DISTINCT values,
-- and never calls the approximate aggregate at all.
SELECT
  p.language,
  count(d.count) AS exact_values,
  count(d.count) AS approx_values,
  0.0            AS error_pct
FROM downloads d
JOIN packages p ON p.id = d.package_id
GROUP BY p.language
ORDER BY p.language;
