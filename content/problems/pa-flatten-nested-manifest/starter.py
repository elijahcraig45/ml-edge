def flatten_manifest(manifest):
    """Every name in the nested manifest, in order, as one flat list."""
    result = []
    for item in manifest:
        # TODO: a list is a group and needs flattening; anything else is a name.
        result.append(item)
    return result
