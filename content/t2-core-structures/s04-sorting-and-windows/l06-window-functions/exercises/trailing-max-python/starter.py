def trailing_max(nums, k):
    """Maximum over each index and the k-1 indices before it."""
    # TODO: this is correct and costs n*k. Carry state between windows instead:
    # each step adds one value on the right and drops at most one on the left.
    return [max(nums[max(0, i - k + 1): i + 1]) for i in range(len(nums))]
