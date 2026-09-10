SELECT p.name, p.language
FROM packages p
WHERE p.id IN (
  SELECT v.package_id
  FROM versions v
  WHERE v.size_kb > 300
)
ORDER BY p.name;
