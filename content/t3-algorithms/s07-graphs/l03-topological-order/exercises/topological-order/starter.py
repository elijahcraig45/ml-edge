def topological_order(graph):
    """A lexicographically smallest topological order, or [] if a cycle exists."""
    # TODO: Kahn's algorithm.
    #   1. count in-degrees: how many edges point AT each node
    #   2. seed a heap with every node whose in-degree is zero
    #   3. pop the smallest, emit it, decrement its dependents, push any that
    #      just hit zero
    #   4. if you emitted fewer nodes than the graph has, there is a cycle
    return []
