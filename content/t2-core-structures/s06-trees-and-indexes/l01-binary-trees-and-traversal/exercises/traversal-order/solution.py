from collections import deque


def traversals(root):
    """Return the four traversal orders of a (value, left, right) tree."""
    pre, ino, post = [], [], []

    def walk(node):
        if node is None:
            return
        value, left, right = node
        pre.append(value)
        walk(left)
        ino.append(value)
        walk(right)
        post.append(value)

    walk(root)

    level = []
    queue = deque([root] if root is not None else [])
    while queue:
        value, left, right = queue.popleft()
        level.append(value)
        if left is not None:
            queue.append(left)
        if right is not None:
            queue.append(right)

    return {"preorder": pre, "inorder": ino, "postorder": post, "level": level}
