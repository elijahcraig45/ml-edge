SELECT name, created_at
FROM packages
WHERE language = 'rust'
ORDER BY created_at DESC
LIMIT 3;
