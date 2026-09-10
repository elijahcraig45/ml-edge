def count_subarrays(nums, k):
    """How many contiguous subarrays of `nums` sum to exactly `k`."""
    # TODO: correct, but it re-adds the same elements over and over.
    # Every subarray sum is a difference of two prefix sums -- use that.
    total = 0
    for i in range(len(nums)):
        running = 0
        for j in range(i, len(nums)):
            running += nums[j]
            if running == k:
                total += 1
    return total
