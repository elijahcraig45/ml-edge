-- Maintainers bucketed by which kinds of package they touch.
-- Written with EXISTS instead of set operators, and the "both" case is never
-- tested: a maintainer who touches both kinds falls into the first branch that
-- matches, so nobody ever lands in the 'both' bucket.
SELECT DISTINCT
  m.handle,
  CASE
    WHEN EXISTS (SELECT 1 FROM package_maintainers pm JOIN packages p ON p.id = pm.package_id
                 WHERE pm.maintainer_id = m.id AND p.license = 'MIT')
      THEN 'mit-only'
    ELSE 'undeclared-only'
  END AS bucket
FROM maintainers m
WHERE EXISTS (
  SELECT 1 FROM package_maintainers pm JOIN packages p ON p.id = pm.package_id
  WHERE pm.maintainer_id = m.id AND (p.license = 'MIT' OR p.license IS NULL)
);
