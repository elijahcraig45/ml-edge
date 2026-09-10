import random


def _matvec(M, x):
    return [sum(row[j] * x[j] for j in range(len(x))) for row in M]


def freivalds(A, B, C, trials):
    """True if C might equal A @ B; False is always correct."""
    n = len(A)
    # TODO: one fixed vector is not a randomised test. An adversary — or plain
    #       bad luck — can build a wrong C that this exact vector cannot see.
    x = [1] * n
    return _matvec(A, _matvec(B, x)) == _matvec(C, x)
