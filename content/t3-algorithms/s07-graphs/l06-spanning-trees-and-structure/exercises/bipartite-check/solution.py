from collections import deque


def two_colouring(graph):
    """A dict node -> 0/1 with no edge inside a colour, or None if impossible."""
    colour = {}
    for start in graph:
        if start in colour:
            continue
        colour[start] = 0
        queue = deque([start])
        while queue:
            u = queue.popleft()
            for v in graph[u]:
                if v not in colour:
                    colour[v] = 1 - colour[u]
                    queue.append(v)
                elif colour[v] == colour[u]:
                    return None
    return colour
