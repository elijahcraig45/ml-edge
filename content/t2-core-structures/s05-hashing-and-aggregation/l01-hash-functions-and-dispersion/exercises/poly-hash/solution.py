def poly_hash(text, buckets):
    """Hash `text` into a bucket index in [0, buckets)."""
    modulus = (1 << 61) - 1
    h = 0
    for ch in text:
        h = (h * 131 + ord(ch)) % modulus
    return h % buckets
