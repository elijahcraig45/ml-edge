def poly_hash(text, buckets):
    """Hash `text` into a bucket index in [0, buckets)."""
    # TODO: this adds the character codes, so it cannot tell "1.0.2" from
    # "2.0.1". Multiply the accumulator by 131 before adding each character.
    h = 0
    for ch in text:
        h = h + ord(ch)
    return h % buckets
