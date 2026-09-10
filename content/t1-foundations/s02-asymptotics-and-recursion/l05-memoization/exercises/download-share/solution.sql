WITH totals AS (
  SELECT package_id, sum(count) AS downloads
  FROM downloads
  GROUP BY package_id
)
SELECT
  p.name,
  t.downloads,
  round(t.downloads * 100.0 / (SELECT sum(downloads) FROM totals), 2) AS pct_of_registry
FROM totals t
JOIN packages p ON p.id = t.package_id
ORDER BY t.downloads DESC, p.name;
