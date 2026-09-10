def max_non_overlapping(intervals):
    """Largest number of pairwise non-overlapping half-open intervals."""
    # Earliest start wins the race and blocks the machine.
    # TODO: sort by the quantity the rest of the schedule actually depends on.
    count, last_end = 0, float("-inf")
    for start, end in sorted(intervals, key=lambda job: job[0]):
        if start >= last_end:
            count += 1
            last_end = end
    return count
