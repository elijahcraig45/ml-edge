SELECT
  count(*)                  AS total_rows,
  count(license)            AS licenses_known,
  count(*) - count(license) AS licenses_missing,
  count(DISTINCT license)   AS distinct_licenses
FROM packages;
