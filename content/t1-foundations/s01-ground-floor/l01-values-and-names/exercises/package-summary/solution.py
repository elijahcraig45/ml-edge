def summarise(packages):
    """Return {"count": int, "total_kb": int, "largest": str | None}."""
    if not packages:
        return {"count": 0, "total_kb": 0, "largest": None}
    largest = max(packages, key=lambda p: p["size_kb"])
    return {
        "count": len(packages),
        "total_kb": sum(p["size_kb"] for p in packages),
        "largest": largest["name"],
    }
