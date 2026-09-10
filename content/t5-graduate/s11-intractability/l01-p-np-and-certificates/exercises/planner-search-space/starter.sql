-- Every non-empty subset of the five relations, grouped by size.
-- This ignores the join graph entirely, so it counts disconnected subsets like
-- {versions, downloads} that a planner would never build a plan for.
SELECT bit_count(mask) AS relations, count(*) AS connected_subsets
FROM (SELECT unnest(range(1, 32)) AS mask)
GROUP BY 1
ORDER BY 1;
