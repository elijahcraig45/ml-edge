WITH dl AS (
  SELECT package_id, sum(count) AS downloads
  FROM downloads
  GROUP BY package_id
),
rl AS (
  SELECT package_id, count(*) AS releases
  FROM versions
  GROUP BY package_id
)
SELECT
  p.language,
  sum(dl.downloads) AS downloads,
  sum(rl.releases)  AS releases,
  round(sum(dl.downloads) / sum(rl.releases), 2) AS downloads_per_release
FROM packages p
JOIN dl ON dl.package_id = p.id
JOIN rl ON rl.package_id = p.id
GROUP BY p.language
ORDER BY p.language;
