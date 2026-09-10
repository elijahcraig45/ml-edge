def redundant_connection(edges):
    """The last edge whose endpoints were already connected, or None."""
    parent = {}
    last = None
    for a, b in edges:
        # TODO: find the root of a and of b (creating them if new). If the roots
        # match, this edge is redundant; otherwise merge the two groups.
        pass
    return last
