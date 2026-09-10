-- The better of "every even-numbered day" and "every odd-numbered day".
-- Always legal, and too low for twelve of the twenty packages.
WITH numbered AS (
  SELECT package_id,
         count,
         row_number() OVER (PARTITION BY package_id ORDER BY day) - 1 AS day_index
  FROM downloads
)
SELECT p.name,
       greatest(sum(CASE WHEN n.day_index % 2 = 0 THEN n.count ELSE 0 END),
                sum(CASE WHEN n.day_index % 2 = 1 THEN n.count ELSE 0 END)) AS best_total
FROM numbered n
JOIN packages p ON p.id = n.package_id
GROUP BY p.name
ORDER BY best_total DESC, p.name;
