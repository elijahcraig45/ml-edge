def build_csr(n, edges):
    """Return (indptr, indices) in CSR form, each neighbour run sorted ascending."""
    # TODO: three passes.
    #   1. count the out-degree of every node
    #   2. prefix-sum the degrees into indptr (length n + 1)
    #   3. walk the edges again, writing each target into its node's slice
    indptr = [0] * (n + 1)
    indices = []
    return indptr, indices


def neighbours(indptr, indices, u):
    """The out-neighbours of u, read straight out of the CSR arrays."""
    # TODO: one slice. No loop, no search.
    return []
