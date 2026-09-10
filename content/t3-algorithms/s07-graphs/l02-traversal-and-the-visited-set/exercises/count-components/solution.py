def count_components(graph):
    """How many connected pieces the graph has."""
    seen = set()
    components = 0
    for start in graph:
        if start in seen:
            continue
        components += 1
        seen.add(start)
        stack = [start]
        while stack:
            node = stack.pop()
            for nxt in graph[node]:
                if nxt not in seen:
                    seen.add(nxt)
                    stack.append(nxt)
    return components
