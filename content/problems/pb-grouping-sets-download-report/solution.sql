SELECT
  CASE
    WHEN GROUPING(p.language) = 0 AND GROUPING(d.day) = 0 THEN 'language-day'
    WHEN GROUPING(p.language) = 0                         THEN 'language'
    WHEN GROUPING(d.day) = 0                              THEN 'day'
    ELSE 'total'
  END AS scope,
  CASE WHEN GROUPING(p.language) = 1 THEN '(all)' ELSE p.language END AS language,
  d.day,
  sum(d.count) AS downloads
FROM packages p
JOIN downloads d ON d.package_id = p.id
GROUP BY GROUPING SETS ((p.language, d.day), (p.language), (d.day), ());
