-- Correct rows, unusable predicate: substr() tells the optimiser nothing about
-- where these values sort, so every row has to be examined.
SELECT package_id, version, published_at
FROM versions
WHERE substr(version, 1, 2) = '1.'
ORDER BY version, package_id;
