SELECT p.name, count(v.id) AS stable_versions
FROM packages p
LEFT JOIN versions v
       ON v.package_id = p.id
      AND NOT v.is_prerelease
GROUP BY p.name;
