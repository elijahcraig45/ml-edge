-- Top two packages per language by total downloads.
-- This ranks correctly but LIMIT applies to the whole result, not per language.
WITH totals AS (
  SELECT p.language, p.name, sum(d.count) AS total
  FROM packages p
  JOIN downloads d ON d.package_id = p.id
  GROUP BY p.language, p.name
)
SELECT language, name, total
FROM totals
ORDER BY language, total DESC
LIMIT 2;
