def release_board(rows):
    """Rows by language ascending, then name descending within a language."""
    by_name_desc = sorted(rows, key=lambda r: r["name"], reverse=True)
    return sorted(by_name_desc, key=lambda r: r["language"])
