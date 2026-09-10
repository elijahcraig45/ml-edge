import heapq


def topological_order(graph):
    """A lexicographically smallest topological order, or [] if a cycle exists."""
    indegree = {node: 0 for node in graph}
    for u in graph:
        for v in graph[u]:
            indegree[v] += 1

    ready = [node for node in graph if indegree[node] == 0]
    heapq.heapify(ready)

    order = []
    while ready:
        u = heapq.heappop(ready)
        order.append(u)
        for v in graph[u]:
            indegree[v] -= 1
            if indegree[v] == 0:
                heapq.heappush(ready, v)

    return order if len(order) == len(graph) else []
