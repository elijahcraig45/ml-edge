-- Right answer, wrong plan: row_number() has to rank every package before the
-- filter on the rank can run, so the engine sorts the whole result.
SELECT name, downloads
FROM (
  SELECT
    p.name                                          AS name,
    sum(d.count)                                    AS downloads,
    row_number() OVER (ORDER BY sum(d.count) DESC)  AS rank
  FROM downloads d
  JOIN packages p ON p.id = d.package_id
  GROUP BY p.name
)
WHERE rank <= 3
ORDER BY downloads DESC;
