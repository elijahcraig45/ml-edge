def longest_cluster(slots):
    """Longest run of consecutive occupied slots, treating the table as circular."""
    # TODO: this stops at the last index, so a run that wraps past slot 0
    # is reported as two shorter runs.
    longest = current = 0
    for slot in slots:
        if slot is None:
            current = 0
        else:
            current += 1
            if current > longest:
                longest = current
    return longest
