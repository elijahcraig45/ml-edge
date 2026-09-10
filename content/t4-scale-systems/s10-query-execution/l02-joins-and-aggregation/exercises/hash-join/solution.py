def hash_join(left, right, left_key, right_key):
    """Join left and right on their key columns, yielding merged rows."""
    buckets = {}
    for row in left:                       # BUILD: materialised, blocking
        buckets.setdefault(row[left_key], []).append(row)

    for row in right:                      # PROBE: streams
        for match in buckets.get(row[right_key], ()):
            yield {**match, **row}
