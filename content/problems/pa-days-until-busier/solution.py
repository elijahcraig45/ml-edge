def days_until_busier(daily):
    """Days to wait after each day for a strictly busier one, else 0."""
    answer = [0] * len(daily)
    pending = []
    for i, count in enumerate(daily):
        while pending and daily[pending[-1]] < count:
            earlier = pending.pop()
            answer[earlier] = i - earlier
        pending.append(i)
    return answer
