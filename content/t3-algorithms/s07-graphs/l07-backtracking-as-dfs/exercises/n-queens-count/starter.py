def count_queens(n):
    """How many ways n queens fit on an n x n board with no two attacking."""
    # State: queens placed in rows 0..row-1, one per row.
    # Move: choose a column for row `row`.
    # Feasibility: that column, that diagonal and that anti-diagonal are free.
    # Goal: row == n.
    cols, diag, anti = set(), set(), set()
    total = 0

    def place(row):
        nonlocal total
        # TODO: goal test, then loop over columns. Skip a column that conflicts
        # BEFORE recursing, record the three keys, recurse, and undo all three.
        return

    place(0)
    return total
