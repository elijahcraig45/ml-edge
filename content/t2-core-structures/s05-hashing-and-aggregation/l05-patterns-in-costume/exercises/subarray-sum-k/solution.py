def count_subarrays(nums, k):
    """How many contiguous subarrays of `nums` sum to exactly `k`."""
    counts = {0: 1}          # the empty prefix has sum 0 and has been seen once
    running = 0
    total = 0
    for x in nums:
        running += x
        total += counts.get(running - k, 0)
        counts[running] = counts.get(running, 0) + 1
    return total
