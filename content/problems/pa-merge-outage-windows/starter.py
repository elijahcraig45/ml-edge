def merge_outages(windows):
    """Overlapping or touching windows collapsed into one, sorted by start."""
    if not windows:
        return []
    # TODO: sort by start first. Then each window only ever has to be compared
    # against the one you are currently holding open.
    return list(windows)
