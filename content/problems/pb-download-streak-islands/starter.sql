-- Runs of consecutive days on which a package saw 1000+ downloads.
-- min and max over the whole package cannot see the quiet days in the middle,
-- so package 10's two four-day runs come back as one eight-day span.
SELECT
  package_id,
  min(day) AS first_day,
  max(day) AS last_day,
  count(*) AS days
FROM downloads
WHERE count >= 1000
GROUP BY package_id;
