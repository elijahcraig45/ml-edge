from math import prod


def estimate_size(running, new_rows, new_name, already_joined, edges):
    """Estimated rows after joining `new_name` onto the current intermediate."""
    selectivity = prod(
        edges.get(frozenset({new_name, j}), 1.0) for j in already_joined
    )
    return running * new_rows * selectivity


def greedy_order(relations, edges):
    """Left-deep join order, chosen greedily by estimated intermediate size."""
    # TODO: this orders by table size alone and ignores both the selectivities
    # and the risk of a cross product. Choose each next relation by the size of
    # the result it produces, preferring relations connected by an edge.
    return sorted(relations, key=lambda n: (relations[n], n))
