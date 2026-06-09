from collections import Counter

from app.models.user import ProctoringViolation


SEVERITY_PENALTIES = {
    "low": 3,
    "medium": 8,
    "high": 18,
}


def calculate_trust(violations: list[ProctoringViolation]) -> dict:
    """Compute an integrity score from stored proctoring violations."""
    penalty = 0
    counts = Counter()
    for violation in violations:
        severity = (violation.severity or "medium").lower()
        v_type = violation.violation_type or "unknown"
        counts[v_type] += 1
        penalty += SEVERITY_PENALTIES.get(severity, SEVERITY_PENALTIES["medium"])
        if counts[v_type] > 1:
            penalty += min(10, counts[v_type] * 2)

    score = max(0, 100 - penalty)
    if score >= 90:
        level = "clean"
        note = "No significant exam integrity issues detected."
    elif score >= 75:
        level = "watch"
        note = "Minor proctoring concerns detected; review if needed."
    elif score >= 50:
        level = "risk"
        note = "Multiple proctoring concerns detected; manual review recommended."
    else:
        level = "critical"
        note = "Severe exam integrity risk; manual review strongly recommended."

    return {
        "trust_score": score,
        "trust_level": level,
        "trust_note": note,
        "violation_count": len(violations),
    }
