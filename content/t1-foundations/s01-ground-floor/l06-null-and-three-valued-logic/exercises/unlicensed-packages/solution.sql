SELECT name, license
FROM packages
WHERE license <> 'MIT' OR license IS NULL
ORDER BY name;
