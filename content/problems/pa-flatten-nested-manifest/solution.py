def flatten_manifest(manifest):
    """Every name in the nested manifest, in order, as one flat list."""
    result = []
    for item in manifest:
        if isinstance(item, list):
            result.extend(flatten_manifest(item))
        else:
            result.append(item)
    return result
