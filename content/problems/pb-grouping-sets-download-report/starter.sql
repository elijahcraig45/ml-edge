-- Downloads by language and day, with subtotals.
-- ROLLUP only drops columns off the right-hand end, so this gives the
-- (language, day) detail, the per-language totals and the grand total --
-- 45 rows, with the ten per-day totals missing.
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
GROUP BY ROLLUP (p.language, d.day);
