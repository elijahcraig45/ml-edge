def build_csr(n, edges):
    """Return (indptr, indices) in CSR form, each neighbour run sorted ascending."""
    degree = [0] * n
    for u, _ in edges:
        degree[u] += 1

    indptr = [0] * (n + 1)
    for u in range(n):
        indptr[u + 1] = indptr[u] + degree[u]

    indices = [0] * len(edges)
    cursor = indptr[:n]
    for u, v in edges:
        indices[cursor[u]] = v
        cursor[u] += 1

    for u in range(n):
        indices[indptr[u]:indptr[u + 1]] = sorted(indices[indptr[u]:indptr[u + 1]])
    return indptr, indices


def neighbours(indptr, indices, u):
    """The out-neighbours of u, read straight out of the CSR arrays."""
    return indices[indptr[u]:indptr[u + 1]]
