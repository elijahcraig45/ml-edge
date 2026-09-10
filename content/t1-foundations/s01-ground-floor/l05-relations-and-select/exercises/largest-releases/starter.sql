-- Non-prerelease versions over 200 KB, largest first.
SELECT version, size_kb, published_at
FROM versions
ORDER BY size_kb DESC;
