def group_anagrams(names):
    """Group names that are permutations of each other, in first-seen order."""
    groups = {}
    for name in names:
        key = "".join(sorted(name))
        groups.setdefault(key, []).append(name)
    return list(groups.values())
