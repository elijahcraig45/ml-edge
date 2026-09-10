def hash_join(left, right, left_key, right_key):
    """Join left and right on their key columns, yielding merged rows."""
    # TODO: this is a nested-loop join. It is correct and it compares every
    # pair. Build a hash table from `left` first, then probe it with `right`.
    left_rows = list(left)
    for row in right:
        for match in left_rows:
            if match[left_key] == row[right_key]:
                yield {**match, **row}
