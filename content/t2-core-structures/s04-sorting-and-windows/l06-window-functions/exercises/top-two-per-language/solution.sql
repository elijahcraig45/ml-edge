WITH totals AS (
  SELECT p.language, p.name, sum(d.count) AS total
  FROM packages p
  JOIN downloads d ON d.package_id = p.id
  GROUP BY p.language, p.name
)
SELECT language, name, total
FROM totals
QUALIFY row_number() OVER (PARTITION BY language ORDER BY total DESC, name) <= 2
ORDER BY language, total DESC;
