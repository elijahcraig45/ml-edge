-- Constrains only the index's SECOND column, so the index cannot be used and
-- the answer is wrong as well: every language comes back.
SELECT name, created_at
FROM packages
WHERE created_at >= DATE '2019-01-01'
ORDER BY created_at;
