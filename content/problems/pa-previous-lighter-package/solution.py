def previous_lighter(sizes):
    """Index of the closest earlier strictly smaller package, else -1."""
    answer = []
    stack = []
    for i, size in enumerate(sizes):
        while stack and sizes[stack[-1]] >= size:
            stack.pop()
        answer.append(stack[-1] if stack else -1)
        stack.append(i)
    return answer
