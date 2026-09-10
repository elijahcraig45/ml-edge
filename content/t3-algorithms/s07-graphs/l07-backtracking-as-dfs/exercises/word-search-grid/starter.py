def exists(board, word):
    """True if word can be spelled along a path of orthogonally adjacent cells."""
    # State: a cell, and how much of `word` has been matched.
    # Moves: the four orthogonal neighbours.
    # Feasibility: on the grid, right letter, and not already used on THIS path.
    # Goal: the whole word matched.
    #
    # TODO: write `visit(r, c, i)`, mark the cell before recursing and restore it
    # afterwards, and start a search from every cell.
    return False
