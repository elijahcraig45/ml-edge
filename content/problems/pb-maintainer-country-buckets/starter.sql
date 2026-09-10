-- Maintainers per country, with the undisclosed ones under a printable label.
-- This leaves the missing bucket labelled NULL.
SELECT
  country,
  count(*)       AS maintainers,
  min(joined_at) AS first_joined
FROM maintainers
GROUP BY country;
