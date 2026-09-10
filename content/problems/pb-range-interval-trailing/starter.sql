-- Registry-wide rolling three-day download total.
-- ROWS 2 PRECEDING sums three *rows*, which on this table means three packages
-- on the same day -- and which three is decided by an ordering the query never
-- states.
SELECT
  package_id,
  day,
  count,
  sum(count) OVER (
    ORDER BY day
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
  ) AS trailing_3day
FROM downloads;
