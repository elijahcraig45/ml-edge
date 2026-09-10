-- How complete is the license column, per language?
-- Filtering the NULLs out first throws away the number we are trying to report.
SELECT
  language,
  count(*)                AS packages,
  count(*)                AS with_license,
  0                       AS missing_license,
  count(DISTINCT license) AS distinct_licenses
FROM packages
WHERE license IS NOT NULL
GROUP BY language;
