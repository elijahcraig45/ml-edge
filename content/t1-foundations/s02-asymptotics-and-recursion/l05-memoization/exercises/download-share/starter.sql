-- Each package's download total and its share of the registry-wide total.
-- The share column is missing, and the grand total is needed on every row.
SELECT
  p.name,
  sum(d.count) AS downloads
FROM downloads d
JOIN packages p ON p.id = d.package_id
GROUP BY p.name
ORDER BY downloads DESC, p.name;
