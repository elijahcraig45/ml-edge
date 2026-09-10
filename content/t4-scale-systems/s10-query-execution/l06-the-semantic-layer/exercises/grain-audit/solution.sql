WITH truth AS (
  SELECT package_id, sum(count) AS true_total
  FROM downloads
  GROUP BY package_id
),
fanned AS (
  SELECT d.package_id, sum(d.count) AS joined_total
  FROM downloads d
  JOIN package_maintainers pm ON pm.package_id = d.package_id
  GROUP BY d.package_id
)
SELECT p.name, t.true_total, f.joined_total
FROM packages p
JOIN truth  t ON t.package_id = p.id
JOIN fanned f ON f.package_id = p.id
WHERE t.true_total <> f.joined_total
ORDER BY p.name;
