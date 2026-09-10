def census(target, sizes):
    """Run the naive block recursion and return (calls, distinct_arguments)."""

    def f(t):
        # TODO: record this invocation and this value of t before anything else.
        if t == 0:
            return 0
        if t < 0:
            return float("inf")
        return 1 + min(f(t - s) for s in sizes)

    f(target)
    return 0, 0
