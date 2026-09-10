-- Packages whose declared license is used by no rust package.
-- This returns zero rows, because one rust package has a NULL license
-- and NOT IN cannot survive a NULL in its list.
SELECT name, license
FROM packages
WHERE license NOT IN (
  SELECT license FROM packages WHERE language = 'rust'
);
