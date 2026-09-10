-- Registry-wide downloads over this day and the two days before it.
-- Every one of the 200 rows is wrong: there are twenty rows per day, so three
-- physical rows is nowhere near three days.
SELECT day, package_id, count,
       sum(count) OVER (ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS rolling_3d
FROM downloads
ORDER BY day, package_id;
