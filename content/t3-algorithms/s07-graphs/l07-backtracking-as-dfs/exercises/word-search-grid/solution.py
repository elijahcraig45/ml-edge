def exists(board, word):
    """True if word can be spelled along a path of orthogonally adjacent cells."""
    if not word:
        return True
    if not board or not board[0]:
        return False
    rows, cols = len(board), len(board[0])

    def visit(r, c, i):
        if i == len(word):
            return True
        if not (0 <= r < rows and 0 <= c < cols) or board[r][c] != word[i]:
            return False
        board[r][c] = None                        # on the current path
        found = (
            visit(r + 1, c, i + 1)
            or visit(r - 1, c, i + 1)
            or visit(r, c + 1, i + 1)
            or visit(r, c - 1, i + 1)
        )
        board[r][c] = word[i]                     # undo
        return found

    return any(visit(r, c, 0) for r in range(rows) for c in range(cols))
