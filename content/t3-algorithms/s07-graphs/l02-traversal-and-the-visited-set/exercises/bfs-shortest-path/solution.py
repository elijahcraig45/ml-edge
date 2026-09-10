from collections import deque


def shortest_path(graph, start, goal):
    """A path with the fewest edges from start to goal, or None."""
    if start not in graph or goal not in graph:
        return None
    if start == goal:
        return [start]

    parent = {start: None}
    queue = deque([start])
    while queue:
        node = queue.popleft()
        for nxt in graph[node]:
            if nxt in parent:
                continue
            parent[nxt] = node
            if nxt == goal:
                path = [goal]
                while parent[path[-1]] is not None:
                    path.append(parent[path[-1]])
                path.reverse()
                return path
            queue.append(nxt)
    return None
