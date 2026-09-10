WITH ranked AS (
  SELECT
    d.package_id,
    p.name,
    d.day,
    d.count,
    row_number() OVER (PARTITION BY d.package_id ORDER BY d.count DESC) AS rn
  FROM downloads d
  JOIN packages p ON p.id = d.package_id
)
SELECT package_id, name, day, count
FROM ranked
WHERE rn = 1;
