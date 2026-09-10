def contained_in(q1, q2):
    """True when Q1 is contained in Q2 on every database."""
    head1, body1 = q1
    head2, body2 = q2
    if len(head1) != len(head2):
        return False

    candidates = {}
    for rel, terms in body1:
        candidates.setdefault((rel, len(terms)), []).append(terms)

    mapping = {}

    def bind(term, value):
        if isinstance(term, str):
            if term in mapping:
                return mapping[term] == value
            mapping[term] = value
            return True
        return term == value

    def place(i):
        if i == len(body2):
            return True
        rel, terms = body2[i]
        for cand in candidates.get((rel, len(terms)), []):
            saved = dict(mapping)
            if all(bind(t, c) for t, c in zip(terms, cand)) and place(i + 1):
                return True
            mapping.clear()
            mapping.update(saved)
        return False

    for t2, t1 in zip(head2, head1):
        if not bind(t2, t1):
            return False
    return place(0)
