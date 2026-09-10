import random


def _matvec(M, x):
    return [sum(row[j] * x[j] for j in range(len(x))) for row in M]


def freivalds(A, B, C, trials):
    """True if C might equal A @ B; False is always correct."""
    n = len(A)
    for _ in range(trials):
        x = [random.randint(0, 1) for _ in range(n)]
        if _matvec(A, _matvec(B, x)) != _matvec(C, x):
            return False
    return True
