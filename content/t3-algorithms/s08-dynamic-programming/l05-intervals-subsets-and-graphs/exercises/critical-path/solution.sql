WITH RECURSIVE deps(pkg, needs) AS (
  SELECT * FROM (VALUES (1,3),(1,12),(4,1),(6,12),(7,1),(7,17),(10,6),
                        (10,7),(11,16),(16,2),(18,11),(20,7),(20,19)) v(a, b)
),
cost AS (
  SELECT package_id AS id, max(size_kb) AS kb FROM versions GROUP BY package_id
),
chain(root, node, total) AS (
  SELECT c.id, c.id, c.kb FROM cost c
  UNION ALL
  SELECT ch.root, d.needs, ch.total + c.kb
  FROM chain ch
  JOIN deps d ON d.pkg = ch.node
  JOIN cost c ON c.id = d.needs
)
SELECT p.name, max(ch.total) AS critical_path_kb
FROM chain ch
JOIN packages p ON p.id = ch.root
GROUP BY p.name
ORDER BY critical_path_kb DESC, p.name;
