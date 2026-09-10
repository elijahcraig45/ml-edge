-- Day-over-day download deltas.
-- No PARTITION BY, so the whole table is one window: most packages take their
-- "previous day" from whichever row the engine happened to emit before them.
SELECT
  package_id,
  day,
  count,
  lag(count)  OVER (ORDER BY day) AS prev_count,
  count - lag(count) OVER (ORDER BY day) AS delta,
  lead(count) OVER (ORDER BY day) AS next_count
FROM downloads;
