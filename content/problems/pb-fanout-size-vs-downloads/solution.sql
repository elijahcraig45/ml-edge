WITH release_stats AS (
  SELECT package_id,
         count(*)     AS releases,
         sum(size_kb) AS total_size_kb
  FROM versions
  GROUP BY package_id
),
download_stats AS (
  SELECT package_id,
         sum(count)          AS total_downloads,
         count(DISTINCT day) AS download_days
  FROM downloads
  GROUP BY package_id
)
SELECT
  p.name,
  r.releases,
  r.total_size_kb,
  d.total_downloads,
  d.download_days
FROM packages p
JOIN release_stats  r ON r.package_id = p.id
JOIN download_stats d ON d.package_id = p.id;
