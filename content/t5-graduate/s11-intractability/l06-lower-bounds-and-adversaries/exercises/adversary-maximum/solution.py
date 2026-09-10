class _Adversary:
    def __init__(self, n):
        self.n = n
        self.defeated = []
        self.comparisons = 0
        self.log = []

    def compare(self, i, j):
        self.comparisons += 1
        di = i in self.defeated
        dj = j in self.defeated
        if not di and not dj:
            self.defeated.append(j)
            answer = True
        elif di and not dj:
            answer = False
        elif dj and not di:
            answer = True
        else:
            answer = self.defeated.index(i) > self.defeated.index(j)
        self.log.append((i, j, answer))
        return answer

    def witness(self):
        values = [0] * self.n
        for rank, idx in enumerate(self.defeated):
            values[idx] = rank + 1
        undefeated = [i for i in range(self.n) if i not in self.defeated]
        top = self.n
        for idx in sorted(undefeated, reverse=True):
            values[idx] = top
            top -= 1
        return values


def make_adversary(n):
    """An adversary that forces n - 1 comparisons out of any correct max-finder."""
    return _Adversary(n)
