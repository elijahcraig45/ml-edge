-- One row per language, with the true selectivity next to the flat 1/d guess
-- a planner would use without statistics.
SELECT
  language,
  count(*) AS matching_rows
FROM packages
GROUP BY language
ORDER BY matching_rows DESC, language;
