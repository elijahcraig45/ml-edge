def merge_runs(left, right):
    """Merge two size-sorted (size_kb, name) lists into one, ties to `left`."""
    out = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i][0] <= right[j][0]:
            out.append(left[i])
            i += 1
        else:
            out.append(right[j])
            j += 1
    out.extend(left[i:])
    out.extend(right[j:])
    return out
