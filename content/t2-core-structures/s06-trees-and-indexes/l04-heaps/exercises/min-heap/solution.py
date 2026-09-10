def _sift_up(heap, i):
    while i > 0:
        parent = (i - 1) // 2
        if heap[i] < heap[parent]:
            heap[i], heap[parent] = heap[parent], heap[i]
            i = parent
        else:
            return


def _sift_down(heap, i):
    n = len(heap)
    while True:
        left, right, smallest = 2 * i + 1, 2 * i + 2, i
        if left < n and heap[left] < heap[smallest]:
            smallest = left
        if right < n and heap[right] < heap[smallest]:
            smallest = right
        if smallest == i:
            return
        heap[i], heap[smallest] = heap[smallest], heap[i]
        i = smallest


def heap_push(heap, value):
    """Add value to the heap, in place."""
    heap.append(value)
    _sift_up(heap, len(heap) - 1)


def heap_pop(heap):
    """Remove and return the smallest value. The heap is not empty."""
    last = heap.pop()
    if not heap:
        return last
    top, heap[0] = heap[0], last
    _sift_down(heap, 0)
    return top


def heapify(values):
    """Return a new list holding these values as a valid min-heap."""
    heap = list(values)
    for i in range(len(heap) // 2 - 1, -1, -1):
        _sift_down(heap, i)
    return heap
