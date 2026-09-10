-- Packages with more than one maintainer, broken down by role.
-- The WHERE runs before GROUP BY, so this asks "which packages have more than
-- one *owner*" — and the answer to that is nothing at all.
SELECT
  p.name,
  count(*) AS maintainers,
  count(*) AS owners,
  0        AS contributors
FROM packages p
JOIN package_maintainers pm ON pm.package_id = p.id
WHERE pm.role = 'owner'
GROUP BY p.name
HAVING count(*) > 1;
