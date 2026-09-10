def feature_sets(features):
    """Every combination of the optional features, including the empty one."""
    if not features:
        return [[]]
    last = features[-1]
    rest = feature_sets(features[:-1])
    return rest + [combo + [last] for combo in rest]
