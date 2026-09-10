WITH package_downloads AS (
  SELECT package_id, sum(count) AS total_downloads
  FROM downloads
  GROUP BY package_id
),
package_team AS (
  SELECT package_id, count(*) AS maintainer_count
  FROM package_maintainers
  GROUP BY package_id
)
SELECT
  p.name,
  d.total_downloads,
  t.maintainer_count
FROM packages p
JOIN package_downloads d ON d.package_id = p.id
JOIN package_team t ON t.package_id = p.id
ORDER BY d.total_downloads DESC, p.name;
