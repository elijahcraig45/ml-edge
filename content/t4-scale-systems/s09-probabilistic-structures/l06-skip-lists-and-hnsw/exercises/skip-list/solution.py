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
        update, node = [None] * self.MAX_HEIGHT, self.head
        for level in range(self.MAX_HEIGHT - 1, -1, -1):
            while node.forward[level] is not None and node.forward[level].value < value:
                node = node.forward[level]
            update[level] = node
        return update

    def insert(self, value):
        """Insert. Return True if added, False if `value` was already present."""
        update = self.predecessors(value)
        nxt = update[0].forward[0]
        if nxt is not None and nxt.value == value:
            return False
        node = Node(value, self.random_height())
        for level in range(len(node.forward)):
            node.forward[level] = update[level].forward[level]
            update[level].forward[level] = node
        return True

    def __contains__(self, value):
        nxt = self.predecessors(value)[0].forward[0]
        return nxt is not None and nxt.value == value

    def delete(self, value):
        """Remove. Return True if it was there, False otherwise."""
        update = self.predecessors(value)
        target = update[0].forward[0]
        if target is None or target.value != value:
            return False
        for level in range(len(target.forward)):
            if update[level].forward[level] is target:
                update[level].forward[level] = target.forward[level]
        return True
