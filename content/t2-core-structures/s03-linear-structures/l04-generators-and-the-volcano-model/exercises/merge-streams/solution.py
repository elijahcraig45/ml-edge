_DONE = object()


def merge_sorted(left, right):
    """Merge two ascending streams into one ascending stream, lazily.

    Pulls at most one item ahead from each side and never holds more than two.
    """
    left = iter(left)
    right = iter(right)
    a = next(left, _DONE)
    b = next(right, _DONE)
    while a is not _DONE and b is not _DONE:
        if b < a:
            yield b
            b = next(right, _DONE)
        else:
            yield a
            a = next(left, _DONE)
    while a is not _DONE:
        yield a
        a = next(left, _DONE)
    while b is not _DONE:
        yield b
        b = next(right, _DONE)
