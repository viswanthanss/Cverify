from __future__ import annotations

CLUSTER_LABELS = {
    0: "Seniors Confirmes",
    1: "Experts Techniques",
    2: "Juniors Prometteurs",
    3: "Profils Polyvalents",
}


def build_recommendation(
    hire_probability: float,
    predicted_salary: float,
    candidate_cluster: int | None,
    job_role: str | None,
) -> str:
    pct = round(hire_probability * 100, 1)
    role_label = job_role or "this role"

    # Decision tier
    if hire_probability >= 0.85:
        verdict = f"Top priority — {pct}% match for {role_label}"
        action = "Schedule interview immediately. Strong candidate."
    elif hire_probability >= 0.70:
        verdict = f"Strong fit — {pct}% match for {role_label}"
        action = "Recommend for shortlist. Review skills alignment before interview."
    elif hire_probability >= 0.50:
        verdict = f"Potential fit — {pct}% match for {role_label}"
        action = "Worth considering. May need additional screening or skills test."
    elif hire_probability >= 0.30:
        verdict = f"Weak fit — {pct}% match for {role_label}"
        action = "Below average match. Consider only if talent pool is limited."
    else:
        verdict = f"Low fit — {pct}% match for {role_label}"
        action = "Not recommended for this role based on current profile."

    # Salary insight
    salary_note = f"Suggested offer band: ${predicted_salary:,.0f}"

    # Cluster insight
    if candidate_cluster is not None:
        cluster_desc = CLUSTER_LABELS.get(
            candidate_cluster, f"Cluster {candidate_cluster}"
        )
        cluster_note = f"Peer group: {cluster_desc} (Cluster {candidate_cluster})"
    else:
        cluster_note = "Peer clustering unavailable"

    return f"{verdict}. {action} {salary_note}. {cluster_note}."
