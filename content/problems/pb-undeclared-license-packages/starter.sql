-- Packages that never declared a license.
-- This returns nothing, and the table is not empty.
SELECT
  name,
  language,
  deprecated_reason IS NOT NULL AS is_deprecated
FROM packages
WHERE license = NULL;
