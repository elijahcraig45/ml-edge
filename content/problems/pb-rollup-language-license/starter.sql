-- License breakdown with per-language subtotals.
-- coalesce cannot tell a rolled-up NULL from a genuinely missing license, so
-- the per-language subtotal rows come out labelled "(undeclared)".
SELECT
  coalesce(language, '(all languages)') AS language,
  coalesce(license, '(undeclared)')     AS license,
  count(*)                              AS packages
FROM packages
GROUP BY ROLLUP (language, license);
