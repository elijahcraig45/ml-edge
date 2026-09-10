-- One row per quantile level. Only the median is here, and only exactly.
-- Add the t-digest's answer, the absolute gap, and the other two levels.
SELECT
  0.50::DOUBLE                            AS q,
  round(quantile_cont("count", 0.50), 2)  AS exact_value
FROM downloads;
