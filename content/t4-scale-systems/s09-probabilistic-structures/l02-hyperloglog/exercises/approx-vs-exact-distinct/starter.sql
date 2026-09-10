-- How many distinct daily download counts does each language's packages show?
-- This is the exact answer. Add the sketch's answer beside it, and the gap.
SELECT
  p.language,
  count(DISTINCT d."count") AS exact_distinct
FROM downloads d
JOIN packages p ON p.id = d.package_id
GROUP BY p.language
ORDER BY p.language;
