-- The day each package hit its download peak.
-- max(day) and max(count) are computed independently of each other, so the
-- day is always the last day in the table and has nothing to do with the peak.
SELECT
  d.package_id,
  p.name,
  max(d.day)   AS day,
  max(d.count) AS count
FROM downloads d
JOIN packages p ON p.id = d.package_id
GROUP BY d.package_id, p.name;
