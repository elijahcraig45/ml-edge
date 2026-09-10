-- The shortcut: it ignores the order of the days, so it is free to sell
-- on a day before the day it bought on.
SELECT p.name,
       max(d.count) - min(d.count) AS best_gain
FROM downloads d
JOIN packages p ON p.id = d.package_id
GROUP BY p.name
ORDER BY best_gain DESC, p.name;
