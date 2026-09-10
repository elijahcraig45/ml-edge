def limit(child, n):
    """Yield the first n rows from child, pulling no more than n of them."""
    if n <= 0:
        return
    taken = 0
    for row in child:
        yield row
        taken += 1
        if taken >= n:
            return
