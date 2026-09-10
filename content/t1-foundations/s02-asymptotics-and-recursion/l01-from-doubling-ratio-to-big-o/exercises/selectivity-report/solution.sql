SELECT
  language,
  count(*) AS matching_rows,
  round(count(*) * 1.0 / (SELECT count(*) FROM packages), 3) AS true_selectivity,
  round(1.0 / (SELECT count(DISTINCT language) FROM packages), 3) AS flat_guess,
  round(
    (count(*) * 1.0 / (SELECT count(*) FROM packages))
      * (SELECT count(DISTINCT language) FROM packages),
    3
  ) AS error_ratio
FROM packages
GROUP BY language
ORDER BY error_ratio DESC, language;
