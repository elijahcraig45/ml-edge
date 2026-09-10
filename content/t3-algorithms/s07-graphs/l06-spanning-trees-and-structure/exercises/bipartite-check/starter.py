from collections import deque


def two_colouring(graph):
    """A dict node -> 0/1 with no edge inside a colour, or None if impossible."""
    # TODO: BFS from an uncoloured node, giving each newly reached neighbour the
    # opposite colour. If you ever meet a neighbour that already has the SAME
    # colour as the node you came from, no two-colouring exists.
    # Remember that a disconnected graph needs one BFS per component.
    return {node: 0 for node in graph}
