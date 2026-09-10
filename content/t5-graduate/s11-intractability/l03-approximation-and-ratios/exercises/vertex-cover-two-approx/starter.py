def approx_cover(n, edges):
    """A vertex cover within a factor of 2 of the smallest one."""
    # TODO: this returns every vertex. It is a valid cover and a terrible one.
    return {v for edge in edges for v in edge}


def matching_used(n, edges):
    """The edges that triggered an insertion — the matching the proof needs."""
    # TODO: record the edges your cover actually reacted to.
    return []
