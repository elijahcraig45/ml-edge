import hashlib


def sig_hash(item, i):
    """The i-th hash function, applied to one item. Given; do not change."""
    return int.from_bytes(
        hashlib.sha256(f"{i}:{item}".encode("utf-8")).digest()[:8], "big"
    )


def minhash_signature(items, num_hashes):
    """A signature: for each of num_hashes hash functions, the minimum over items."""
    # TODO: one minimum per hash function.
    return [0] * num_hashes


def estimate_jaccard(sig_a, sig_b):
    """The fraction of signature positions where the two agree."""
    # TODO: compare position by position.
    return 0.0
