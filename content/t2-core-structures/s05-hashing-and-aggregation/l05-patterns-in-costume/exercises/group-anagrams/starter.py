def group_anagrams(names):
    """Group names that are permutations of each other, in first-seen order."""
    groups = {}
    for name in names:
        # TODO: keying on the name itself only groups identical strings.
        # Build a key that two anagrams share.
        key = name
        groups.setdefault(key, []).append(name)
    return list(groups.values())
