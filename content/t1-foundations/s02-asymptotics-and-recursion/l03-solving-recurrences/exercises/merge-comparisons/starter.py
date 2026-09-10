def merge_sort_count(values):
    """(sorted copy, number of element comparisons performed)."""
    if len(values) <= 1:
        return list(values), 0

    mid = len(values) // 2
    left, left_count = merge_sort_count(values[:mid])
    right, right_count = merge_sort_count(values[mid:])

    merged = []
    # TODO: this counts only the comparisons made at this level of the tree.
    # The recurrence says the total is both children's counts plus this merge.
    comparisons = 0
    i = j = 0
    while i < len(left) and j < len(right):
        comparisons += 1
        if left[i] <= right[j]:
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            j += 1
    merged.extend(left[i:])
    merged.extend(right[j:])
    return merged, comparisons
