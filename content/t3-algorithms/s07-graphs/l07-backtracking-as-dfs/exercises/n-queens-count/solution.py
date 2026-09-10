def count_queens(n):
    """How many ways n queens fit on an n x n board with no two attacking."""
    cols, diag, anti = set(), set(), set()
    total = 0

    def place(row):
        nonlocal total
        if row == n:
            total += 1
            return
        for col in range(n):
            if col in cols or (row - col) in diag or (row + col) in anti:
                continue
            cols.add(col); diag.add(row - col); anti.add(row + col)
            place(row + 1)
            cols.remove(col); diag.remove(row - col); anti.remove(row + col)

    place(0)
    return total
