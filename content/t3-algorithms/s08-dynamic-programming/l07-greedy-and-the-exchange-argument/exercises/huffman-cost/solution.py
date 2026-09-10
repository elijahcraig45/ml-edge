import heapq


def huffman_cost(frequencies):
    """Total encoded length of an optimal prefix code."""
    if len(frequencies) < 2:
        return 0
    heap = list(frequencies)
    heapq.heapify(heap)
    total = 0
    while len(heap) > 1:
        a = heapq.heappop(heap)
        b = heapq.heappop(heap)
        total += a + b
        heapq.heappush(heap, a + b)
    return total
