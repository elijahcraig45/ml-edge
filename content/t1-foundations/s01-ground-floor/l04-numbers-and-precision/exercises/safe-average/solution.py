def all_within(values, target, tolerance):
    """True when every value is within `tolerance` of `target`."""
    return all(abs(value - target) <= tolerance for value in values)
