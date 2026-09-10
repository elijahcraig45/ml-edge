SELECT
  coalesce(country, 'undisclosed') AS country,
  count(*)                         AS maintainers,
  min(joined_at)                   AS first_joined
FROM maintainers
GROUP BY coalesce(country, 'undisclosed');
