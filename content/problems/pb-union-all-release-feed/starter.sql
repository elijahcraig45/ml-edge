-- Registry activity feed: creations and releases in one list.
-- UNION deduplicates across the whole result, so a package created on the day
-- it shipped its first version loses one of its two events. 28 rows, not 46.
SELECT name, created_at AS event_day
FROM packages
UNION
SELECT p.name, v.published_at
FROM versions v
JOIN packages p ON p.id = v.package_id;
