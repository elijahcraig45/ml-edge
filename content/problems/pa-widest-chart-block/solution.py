def widest_block(heights):
    """Area of the largest rectangle that fits inside the bars."""
    best = 0
    stack = []
    for i in range(len(heights) + 1):
        height = 0 if i == len(heights) else heights[i]
        while stack and heights[stack[-1]] >= height:
            top = stack.pop()
            width = i if not stack else i - stack[-1] - 1
            area = heights[top] * width
            if area > best:
                best = area
        stack.append(i)
    return best
