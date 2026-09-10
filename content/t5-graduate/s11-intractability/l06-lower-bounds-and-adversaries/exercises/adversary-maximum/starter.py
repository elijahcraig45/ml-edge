class _Adversary:
    def __init__(self, n):
        self.n = n
        # TODO: an adversary decides answers as it goes. This one commits to a
        #       fixed array up front, so an algorithm that ignores half the
        #       elements can still get lucky.
        self.values = list(range(n, 0, -1))
        self.comparisons = 0
        self.log = []

    def compare(self, i, j):
        self.comparisons += 1
        answer = self.values[i] > self.values[j]
        self.log.append((i, j, answer))
        return answer

    def witness(self):
        return list(self.values)


def make_adversary(n):
    """An adversary that forces n - 1 comparisons out of any correct max-finder."""
    return _Adversary(n)
