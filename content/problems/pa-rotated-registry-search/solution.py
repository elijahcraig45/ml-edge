def find_rotated(values, target):
    """Index of target in a rotated sorted list of distinct ids, else -1."""
    lo, hi = 0, len(values) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if values[mid] == target:
            return mid
        if values[lo] <= values[mid]:
            if values[lo] <= target < values[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:
            if values[mid] < target <= values[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1
