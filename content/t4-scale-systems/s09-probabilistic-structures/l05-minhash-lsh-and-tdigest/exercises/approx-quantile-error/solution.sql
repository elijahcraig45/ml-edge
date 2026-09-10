SELECT
  0.50::DOUBLE                           AS q,
  round(quantile_cont("count", 0.50), 2) AS exact_value,
  approx_quantile("count", 0.50)         AS approx_value,
  round(abs(approx_quantile("count", 0.50) - quantile_cont("count", 0.50)), 2) AS abs_error
FROM downloads
UNION ALL
SELECT
  0.90::DOUBLE,
  round(quantile_cont("count", 0.90), 2),
  approx_quantile("count", 0.90),
  round(abs(approx_quantile("count", 0.90) - quantile_cont("count", 0.90)), 2)
FROM downloads
UNION ALL
SELECT
  0.99::DOUBLE,
  round(quantile_cont("count", 0.99), 2),
  approx_quantile("count", 0.99),
  round(abs(approx_quantile("count", 0.99) - quantile_cont("count", 0.99)), 2)
FROM downloads
ORDER BY q;
