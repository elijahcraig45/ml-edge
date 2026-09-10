-- Looks one edge ahead: a package plus its most expensive direct dependency.
-- treewalk comes out at 442; the chain it is on is worth 1034.
WITH deps(pkg, needs) AS (
  SELECT * FROM (VALUES (1,3),(1,12),(4,1),(6,12),(7,1),(7,17),(10,6),
                        (10,7),(11,16),(16,2),(18,11),(20,7),(20,19)) v(a, b)
),
cost AS (
  SELECT package_id AS id, max(size_kb) AS kb FROM versions GROUP BY package_id
)
SELECT p.name,
       c.kb + coalesce(max(child.kb), 0) AS critical_path_kb
FROM cost c
JOIN packages p ON p.id = c.id
LEFT JOIN deps d ON d.pkg = c.id
LEFT JOIN cost child ON child.id = d.needs
GROUP BY p.name, c.kb
ORDER BY critical_path_kb DESC, p.name;
