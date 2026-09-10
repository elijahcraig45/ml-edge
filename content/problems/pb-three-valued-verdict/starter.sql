-- How does `license = 'MIT'` evaluate across the table?
-- Two branches can only ever produce two answers, so the four packages
-- with no license get counted as "false".
SELECT
  CASE WHEN license = 'MIT' THEN 'true' ELSE 'false' END AS verdict,
  count(*)                                               AS packages
FROM packages
GROUP BY 1;
