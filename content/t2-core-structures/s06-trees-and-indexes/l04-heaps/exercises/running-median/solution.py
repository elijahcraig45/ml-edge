import heapq


def running_median(values):
    """Median of every prefix, as a list of floats."""
    low, high, out = [], [], []      # low is a max-heap, stored negated
    for value in values:
        if low and value <= -low[0]:
            heapq.heappush(low, -value)
        else:
            heapq.heappush(high, value)

        if len(low) > len(high) + 1:
            heapq.heappush(high, -heapq.heappop(low))
        elif len(high) > len(low):
            heapq.heappush(low, -heapq.heappop(high))

        if len(low) > len(high):
            out.append(float(-low[0]))
        else:
            out.append((-low[0] + high[0]) / 2)
    return out
