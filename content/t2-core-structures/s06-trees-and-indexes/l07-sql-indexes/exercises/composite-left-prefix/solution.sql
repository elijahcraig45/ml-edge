SELECT name, created_at
FROM packages
WHERE language = 'python'
  AND created_at >= DATE '2019-01-01'
ORDER BY created_at;
