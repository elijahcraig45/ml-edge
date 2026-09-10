def rank_packages(packages):
    """Names ranked by downloads desc, then year asc, then name asc."""
    ranked = sorted(packages, key=lambda p: (-p[1], p[2], p[0]))
    return [name for name, _downloads, _year in ranked]
