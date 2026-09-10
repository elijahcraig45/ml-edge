import heapq


def distance(a, b):
    """Euclidean distance between two coordinate tuples. Given."""
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


def greedy_search(graph, points, entry, query, ef):
    """One HNSW layer search."""
    d_entry = distance(points[entry], query)
    visited = {entry}
    candidates = [(d_entry, entry)]        # min-heap by distance
    results = [(-d_entry, entry)]          # max-heap by distance

    while candidates:
        d_c, current = heapq.heappop(candidates)
        if d_c > -results[0][0] and len(results) >= ef:
            break
        for neighbour in graph.get(current, ()):
            if neighbour in visited:
                continue
            visited.add(neighbour)
            d_n = distance(points[neighbour], query)
            if len(results) < ef or d_n < -results[0][0]:
                heapq.heappush(candidates, (d_n, neighbour))
                heapq.heappush(results, (-d_n, neighbour))
                if len(results) > ef:
                    heapq.heappop(results)

    return [node for _, node in sorted((-neg, node) for neg, node in results)]
