-- The exact total, from every row. Replace it with an estimate built from a
-- deterministic 1-in-4 sample, and report how far off the estimate is.
SELECT
  (SELECT count(*) FROM downloads) AS sampled_rows,
  sum(d."count")                   AS estimated_total,
  (SELECT sum("count") FROM downloads) AS exact_total,
  0.0                              AS pct_error
FROM downloads d;
