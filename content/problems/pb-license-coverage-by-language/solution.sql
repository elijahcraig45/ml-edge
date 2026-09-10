SELECT
  language,
  count(*)                  AS packages,
  count(license)            AS with_license,
  count(*) - count(license) AS missing_license,
  count(DISTINCT license)   AS distinct_licenses
FROM packages
GROUP BY language;
