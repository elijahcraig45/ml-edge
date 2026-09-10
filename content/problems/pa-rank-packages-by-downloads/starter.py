def rank_packages(packages):
    """Names ranked by downloads desc, then year asc, then name asc."""
    # TODO: one sort with a tuple key. Remember that only the downloads
    # component runs in the opposite direction to the other two.
    ranked = sorted(packages)
    return [name for name, _downloads, _year in ranked]
