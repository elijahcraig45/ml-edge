-- Packages with at least one release over 300 KB.
-- The rows are right. Press Explain: the plan contains LEFT_DELIM_JOIN and
-- DELIM_SCAN, the scaffolding left behind by decorrelating this subquery.
SELECT p.name, p.language
FROM packages p
WHERE EXISTS (
  SELECT 1
  FROM versions v
  WHERE v.package_id = p.id
    AND v.size_kb > 300
)
ORDER BY p.name;
