WITH RECURSIVE numbered AS (
  SELECT package_id,
         row_number() OVER (PARTITION BY package_id ORDER BY day) AS i,
         count AS c
  FROM downloads
),
walk(package_id, i, take, skip) AS (
  SELECT package_id, 1, c, 0 FROM numbered WHERE i = 1
  UNION ALL
  SELECT n.package_id, n.i, w.skip + n.c, greatest(w.take, w.skip)
  FROM walk w
  JOIN numbered n ON n.package_id = w.package_id AND n.i = w.i + 1
)
SELECT p.name, max(greatest(w.take, w.skip)) AS best_total
FROM walk w
JOIN packages p ON p.id = w.package_id
GROUP BY p.name
ORDER BY best_total DESC, p.name;
