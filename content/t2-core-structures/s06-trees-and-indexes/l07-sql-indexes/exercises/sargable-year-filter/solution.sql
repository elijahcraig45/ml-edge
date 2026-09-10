SELECT name, created_at
FROM packages
WHERE created_at >= DATE '2021-01-01'
  AND created_at < DATE '2022-01-01'
ORDER BY created_at;
