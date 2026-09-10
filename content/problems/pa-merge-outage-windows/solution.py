def merge_outages(windows):
    """Overlapping or touching windows collapsed into one, sorted by start."""
    if not windows:
        return []
    ordered = sorted(windows)
    merged = []
    start, end = ordered[0]
    for next_start, next_end in ordered[1:]:
        if next_start <= end:
            if next_end > end:
                end = next_end
        else:
            merged.append((start, end))
            start, end = next_start, next_end
    merged.append((start, end))
    return merged
