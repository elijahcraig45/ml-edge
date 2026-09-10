SELECT
  name,
  language,
  deprecated_reason IS NOT NULL AS is_deprecated
FROM packages
WHERE license IS NULL;
