import random


class Node:
    __slots__ = ("value", "forward")

    def __init__(self, value, height):
        self.value = value
        self.forward = [None] * height     # forward[i] = next node at level i


class SkipList:
    MAX_HEIGHT = 16

    def __init__(self, p=0.5):
        self.p = p
        self.head = Node(None, self.MAX_HEIGHT)

    def random_height(self):
        """Geometric: 1, then keep going while a p-biased coin comes up. Given."""
        height = 1
        while height < self.MAX_HEIGHT and random.random() < self.p:
            height += 1
        return height

    def to_list(self):
        """Every value in order, by walking level 0. Given."""
        out, node = [], self.head.forward[0]
        while node is not None:
            out.append(node.value)
            node = node.forward[0]
        return out

    def predecessors(self, value):
        """MAX_HEIGHT entries: the last node at each level whose value is < `value`."""
        # TODO: descend from the top level. At each level, advance while the
        # next node's value is still smaller; record where you stopped; drop.
        return [self.head] * self.MAX_HEIGHT

    def insert(self, value):
        """Insert. Return True if added, False if `value` was already present."""
        # TODO
        return False

    def __contains__(self, value):
        # TODO
        return False

    def delete(self, value):
        """Remove. Return True if it was there, False otherwise."""
        # TODO
        return False
