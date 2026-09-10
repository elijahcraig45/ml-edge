def longest_cluster(slots):
    """Longest run of consecutive occupied slots, treating the table as circular."""
    n = len(slots)
    if n == 0:
        return 0
    if all(slot is not None for slot in slots):
        return n

    longest = current = 0
    for i in range(2 * n):
        if slots[i % n] is None:
            current = 0
        else:
            current += 1
            if current > longest:
                longest = current
    return longest
