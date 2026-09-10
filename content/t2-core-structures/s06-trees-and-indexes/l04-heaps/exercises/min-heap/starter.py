def heap_push(heap, value):
    """Add value to the heap, in place."""
    heap.append(value)
    # TODO: sift the new element up while it is smaller than its parent.


def heap_pop(heap):
    """Remove and return the smallest value. The heap is not empty."""
    # TODO: take heap[0], move the last element into the root, sift it down.
    return heap.pop(0)


def heapify(values):
    """Return a new list holding these values as a valid min-heap."""
    # TODO: copy, then sift down every internal node, deepest first.
    return list(values)
