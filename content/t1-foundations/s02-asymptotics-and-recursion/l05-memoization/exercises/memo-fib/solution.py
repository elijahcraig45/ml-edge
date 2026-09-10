_memo = {0: 0, 1: 1}


def fib(n):
    """The n-th Fibonacci number, computed once per distinct n."""
    if n not in _memo:
        _memo[n] = fib(n - 1) + fib(n - 2)
    return _memo[n]
