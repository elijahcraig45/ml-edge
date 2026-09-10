SELECT package_id, version, published_at
FROM versions
WHERE version LIKE '1.%'
ORDER BY version, package_id;
