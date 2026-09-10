SELECT name, license
FROM packages
WHERE license IS NOT NULL
  AND license NOT IN (
    SELECT license FROM packages
    WHERE language = 'rust' AND license IS NOT NULL
  );
