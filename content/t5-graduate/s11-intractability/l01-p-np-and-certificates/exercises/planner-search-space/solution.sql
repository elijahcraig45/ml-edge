WITH RECURSIVE
rel(bit, name) AS (
  VALUES (1, 'packages'), (2, 'versions'), (4, 'package_maintainers'),
         (8, 'maintainers'), (16, 'downloads')
),
edge(a, b) AS (
  VALUES (1, 2), (2, 1), (1, 4), (4, 1), (4, 8), (8, 4), (1, 16), (16, 1)
),
connected(mask) AS (
  SELECT bit FROM rel
  UNION
  SELECT c.mask | e.b
  FROM connected c
  JOIN edge e ON (c.mask & e.a) <> 0
  WHERE (c.mask & e.b) = 0
)
SELECT bit_count(mask) AS relations, count(*) AS connected_subsets
FROM connected
GROUP BY 1
ORDER BY 1;
