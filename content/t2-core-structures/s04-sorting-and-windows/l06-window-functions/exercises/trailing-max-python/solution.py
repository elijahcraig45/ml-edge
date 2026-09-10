from collections import deque


def trailing_max(nums, k):
    """Maximum over each index and the k-1 indices before it."""
    out = []
    dq = deque()                       # indices; their values decrease front to back
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        out.append(nums[dq[0]])
    return out
