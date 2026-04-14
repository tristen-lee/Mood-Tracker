def combined_score(entry):
    score = entry["mood_score"]
    if entry["depression"]:
        score -= 3
    if entry["intrusive_thoughts"]:
        score -= 2
    if entry["social_withdrawal"]:
        score -= 2
    if entry["mania"]:
        score += 4
    if entry["racing_thoughts"]:
        score += 2
    if entry["irritability"]:
        score += 1
    if entry["sleep"] <= 5:
        score += 2
    if entry["sleep"] <= 3:
        score += 2
    return score + entry["energy_level"]


def mood_state(score):
    if score <= 4:
        return "Suicidal"
    elif score <= 9:
        return "Depressed"
    elif score <= 15:
        return "Stable"
    elif score <= 20:
        return "Hypomanic"
    else:
        return "Manic"
