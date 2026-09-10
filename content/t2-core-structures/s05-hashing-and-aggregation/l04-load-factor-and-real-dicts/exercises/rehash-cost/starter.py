def rehash_cost(n, capacity=8, growth=2):
    """Simulate n insertions and report (final_capacity, total_entries_copied)."""
    live = 0
    copied = 0
    for _ in range(n):
        if (live + 1) * 3 > capacity * 2:
            capacity = int(capacity * growth)
            # TODO: a rehash does not just change the capacity. Every entry
            # that is currently live has to be moved into the new table.
        live += 1
    return capacity, copied
