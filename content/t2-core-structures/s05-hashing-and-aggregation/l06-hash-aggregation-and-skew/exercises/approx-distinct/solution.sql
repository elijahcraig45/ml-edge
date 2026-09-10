SELECT
  p.language,
  count(DISTINCT d.count)        AS exact_values,
  approx_count_distinct(d.count) AS approx_values,
  round(
    100.0 * (approx_count_distinct(d.count) - count(DISTINCT d.count))
    / count(DISTINCT d.count), 2
  )                              AS error_pct
FROM downloads d
JOIN packages p ON p.id = d.package_id
GROUP BY p.language
ORDER BY p.language;
