def merge_runs(left, right):
    """Merge two size-sorted (size_kb, name) lists into one, ties to `left`."""
    # TODO: both inputs are already sorted. Walk them with two indices instead
    # of concatenating and re-sorting.
    return left + right
