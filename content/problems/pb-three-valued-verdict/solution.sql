SELECT
  CASE
    WHEN license = 'MIT'  THEN 'true'
    WHEN license <> 'MIT' THEN 'false'
    ELSE 'unknown'
  END      AS verdict,
  count(*) AS packages
FROM packages
GROUP BY 1;
