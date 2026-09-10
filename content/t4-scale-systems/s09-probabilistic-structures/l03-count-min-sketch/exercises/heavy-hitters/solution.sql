SELECT
  p.name,
  sum(d."count") AS total_downloads,
  round(100.0 * sum(d."count") / (SELECT sum("count") FROM downloads), 2) AS share_pct
FROM downloads d
JOIN packages p ON p.id = d.package_id
GROUP BY p.name
HAVING sum(d."count") > 0.05 * (SELECT sum("count") FROM downloads)
ORDER BY total_downloads DESC;
