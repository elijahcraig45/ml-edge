def census(target, sizes):
    """Run the naive block recursion and return (calls, distinct_arguments)."""
    calls = 0
    seen = set()

    def f(t):
        nonlocal calls
        calls += 1
        seen.add(t)
        if t == 0:
            return 0
        if t < 0:
            return float("inf")
        return 1 + min(f(t - s) for s in sizes)

    f(target)
    return calls, len(seen)
