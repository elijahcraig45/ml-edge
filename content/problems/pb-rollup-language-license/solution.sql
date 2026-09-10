SELECT
  CASE WHEN GROUPING(language) = 1 THEN '(all languages)'
       ELSE language END AS language,
  CASE WHEN GROUPING(license) = 1 THEN '(all licenses)'
       WHEN license IS NULL       THEN '(undeclared)'
       ELSE license END  AS license,
  count(*)               AS packages
FROM packages
GROUP BY ROLLUP (language, license);
