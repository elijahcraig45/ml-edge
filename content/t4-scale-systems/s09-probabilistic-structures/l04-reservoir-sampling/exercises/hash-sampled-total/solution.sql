SELECT
  count(*)                                AS sampled_rows,
  4 * sum(d."count")                      AS estimated_total,
  (SELECT sum("count") FROM downloads)    AS exact_total,
  round(
    100.0 * (4 * sum(d."count") - (SELECT sum("count") FROM downloads))
          / (SELECT sum("count") FROM downloads), 2
  )                                       AS pct_error
FROM downloads d
WHERE hash(d.package_id, d.day) % 4 = 0;
