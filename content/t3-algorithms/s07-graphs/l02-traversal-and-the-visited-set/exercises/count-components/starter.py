def count_components(graph):
    """How many connected pieces the graph has."""
    # This is correct. It is also a fresh traversal from every single node:
    # each one re-walks its whole component from scratch, so the work is
    # (number of nodes) x (size of their component).
    # TODO: hoist the visited set out of the loop so each node is walked once.
    representatives = set()
    for start in graph:
        seen = {start}
        stack = [start]
        while stack:
            node = stack.pop()
            for nxt in graph[node]:
                if nxt not in seen:
                    seen.add(nxt)
                    stack.append(nxt)
        representatives.add(min(seen))
    return len(representatives)
