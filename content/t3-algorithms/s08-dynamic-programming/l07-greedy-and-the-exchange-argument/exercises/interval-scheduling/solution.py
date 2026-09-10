def max_non_overlapping(intervals):
    """Largest number of pairwise non-overlapping half-open intervals."""
    count, last_end = 0, float("-inf")
    for start, end in sorted(intervals, key=lambda job: job[1]):
        if start >= last_end:
            count += 1
            last_end = end
    return count
