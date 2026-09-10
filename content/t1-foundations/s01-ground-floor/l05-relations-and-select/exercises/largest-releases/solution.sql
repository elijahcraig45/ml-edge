SELECT version, size_kb, published_at
FROM versions
WHERE size_kb > 200
  AND NOT is_prerelease
ORDER BY size_kb DESC;
