def fib(n):
    """The n-th Fibonacci number."""
    # TODO: correct, and it re-derives the same subproblem millions of times.
    # Remember each answer the first time you compute it.
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
