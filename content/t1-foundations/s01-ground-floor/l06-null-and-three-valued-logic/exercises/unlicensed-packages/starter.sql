-- Every package not under the MIT license — including those with no license.
-- This version quietly loses the packages whose license is NULL.
SELECT name, license
FROM packages
WHERE license <> 'MIT'
ORDER BY name;
