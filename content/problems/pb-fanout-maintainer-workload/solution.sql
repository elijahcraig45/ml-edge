WITH release_size AS (
  SELECT package_id, sum(size_kb) AS size_kb
  FROM versions
  GROUP BY package_id
),
package_downloads AS (
  SELECT package_id, sum(count) AS downloads
  FROM downloads
  GROUP BY package_id
)
SELECT
  m.handle,
  count(DISTINCT pm.package_id) AS packages,
  sum(rs.size_kb)               AS total_size_kb,
  sum(pd.downloads)             AS total_downloads
FROM maintainers m
JOIN package_maintainers pm ON pm.maintainer_id = m.id
JOIN release_size      rs ON rs.package_id = pm.package_id
JOIN package_downloads pd ON pd.package_id = pm.package_id
GROUP BY m.handle
HAVING count(DISTINCT pm.package_id) >= 2;
