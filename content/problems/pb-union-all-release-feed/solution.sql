SELECT name, created_at AS event_day
FROM packages
UNION ALL
SELECT p.name, v.published_at
FROM versions v
JOIN packages p ON p.id = v.package_id;
