-- A running total over the whole table, row by row.
-- This one gives every row of a day the same value. Work out which rows the
-- frame contains before changing anything.
SELECT day, package_id, count,
       sum(count) OVER (ORDER BY day) AS running_total
FROM downloads
ORDER BY day, package_id;
