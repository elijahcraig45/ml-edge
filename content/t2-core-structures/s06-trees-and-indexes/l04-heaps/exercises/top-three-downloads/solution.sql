SELECT p.name AS name, sum(d.count) AS downloads
FROM downloads d
JOIN packages p ON p.id = d.package_id
GROUP BY p.name
ORDER BY downloads DESC
LIMIT 3;
