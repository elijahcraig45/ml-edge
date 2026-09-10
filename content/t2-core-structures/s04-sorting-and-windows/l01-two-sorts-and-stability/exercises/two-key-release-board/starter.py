def release_board(rows):
    """Rows by language ascending, then name descending within a language."""
    # TODO: this handles the primary key only. Names inside a language come out
    # in whatever order the input had.
    return sorted(rows, key=lambda r: r["language"])
