def days_until_busier(daily):
    """Days to wait after each day for a strictly busier one, else 0."""
    answer = [0] * len(daily)
    for i in range(len(daily)):
        # TODO: this scans forward from every day. Instead, keep the days whose
        # answers are still open on a stack and settle them as they are beaten.
        for j in range(i + 1, len(daily)):
            if daily[j] > daily[i]:
                answer[i] = j - i
                break
    return answer
