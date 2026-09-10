-- Right answer, unusable predicate: year() has to be evaluated on every row,
-- so no bound on created_at ever reaches the scan.
SELECT name, created_at
FROM packages
WHERE year(created_at) = 2021
ORDER BY created_at;
