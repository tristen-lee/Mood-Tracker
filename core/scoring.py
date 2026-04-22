def combined_score(entry):
    score = entry["mood_score"]

    if entry["depression"]:
        score -= 3

    if entry["intrusive_thoughts"]:
        score -= 2

    if entry["social_withdrawal"]:
        score -= 2

    if entry.get("anxiety"):
        score -= 1

    if entry["mania"]:
        score += 4

    if entry["racing_thoughts"]:
        score += 2

    if entry["irritability"]:
        score += 1

    if entry["psychosis"]:
        if entry["mania"] or entry["racing_thoughts"]:
            score += 3
        elif entry["depression"] or entry["social_withdrawal"]:
            score -= 3
        else:
            score -= 1

    if entry["sleep"] <= 5:
        score += 2

    if entry["sleep"] <= 3:
        score += 2

    ## felt_rested on low sleep is a strong manic prodrome signal
    if entry.get("felt_rested") and entry["sleep"] <= 6:
        score += 2

    return score + entry["energy_level"]


def classify_state(entry):
    mood   = entry["mood_score"]
    energy = entry["energy_level"]
    sleep  = entry["sleep"]

    ## Mania score — evaluated independently from depression
    mania = 0

    if entry["mania"]:
        mania += 4

    if entry["racing_thoughts"]:
        mania += 2

    if entry["irritability"]:
        mania += 1

    if entry.get("anxiety"):
        mania += 1

    if sleep <= 5:
        mania += 2

    if sleep <= 3:
        mania += 1

    ## Felt rested despite low sleep = strongest single manic prodrome indicator
    if entry.get("felt_rested") and sleep <= 6:
        mania += 3

    if energy >= 8:
        mania += 2
    elif energy >= 7:
        mania += 1

    if mood >= 8:
        mania += 1

    ## Depression score — evaluated independently from mania
    dep = 0

    if entry["depression"]:
        dep += 4

    if entry["intrusive_thoughts"]:
        dep += 2

    if entry["social_withdrawal"]:
        dep += 2

    if entry.get("anxiety"):
        dep += 1

    if mood <= 3:
        dep += 3
    elif mood <= 5:
        dep += 1

    if energy <= 2:
        dep += 2
    elif energy <= 4:
        dep += 1

    ## Hypersomnia is a classic depressive symptom
    if sleep >= 12:
        dep += 2
    elif sleep >= 10:
        dep += 1

    ## Sleeping long and still exhausted = strong depressive signal
    if entry.get("felt_rested") is False and sleep >= 9:
        dep += 2

    ## Psychosis: manic context confirms full mania (+3), depressive context confirms severity (+2)
    ## Tie goes to depression — more conservative and clinically safer
    if entry["psychosis"]:
        if mania > dep:
            mania += 3
        else:
            dep += 2

    ## Severe checked first — psychotic depression overrides plain Depressed
    psychotic_depression = entry["psychosis"] and entry["depression"] and mania < 4

    if psychotic_depression or dep >= 9:
        return "Severe"

    if mania >= 4 and dep >= 4:
        return "Mixed"

    if mania >= 9:
        return "Manic"

    if mania >= 4:
        return "Hypomanic"

    if dep >= 4:
        return "Depressed"

    return "Stable"


def mood_state(score):
    ## Legacy aggregate classifier — only used for all-time averages
    if score <= 9:
        return "Depressed"
    elif score <= 15:
        return "Stable"
    elif score <= 20:
        return "Hypomanic"
    else:
        return "Manic"
