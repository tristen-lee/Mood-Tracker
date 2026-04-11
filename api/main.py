from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
from storage.data_manager import load_data, add_entry, save_data
from core.tracker import combined_score, mood_state

app = FastAPI()


# --- Models ---

class Entry(BaseModel):
    sleep: int
    mood_score: int
    mania: bool
    psychosis: bool
    depression: bool
    intrusive_thoughts: bool
    racing_thoughts: bool
    irritability: bool
    energy_level: int
    social_withdrawal: bool
    notes: str


# --- Entry Endpoints ---

@app.get("/entries")
def get_entries():
    return load_data()

@app.post("/entries")
def create_entry(entry: Entry):
    data = entry.model_dump()
    data["timestamp"] = datetime.now().isoformat()
    add_entry(data)
    return {"message": "Entry logged successfully"}

@app.delete("/entries")
def delete_entry(date: str):
    try:
        converted = datetime.strptime(date, "%m/%d/%Y").strftime("%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Use MM/DD/YYYY format, e.g. 04/11/2026.")
    data = load_data()
    updated = [e for e in data if not e["timestamp"].startswith(converted)]
    if len(updated) == len(data):
        raise HTTPException(status_code=404, detail="No entry found for that date.")
    save_data(updated)
    return {"message": f"Entry for {date} deleted."}


@app.put("/entries")
def edit_entry(date: str, entry: Entry):
    try:
        converted = datetime.strptime(date, "%m/%d/%Y").strftime("%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Use MM/DD/YYYY format, e.g. 04/11/2026.")
    data = load_data()
    for i, e in enumerate(data):
        if e["timestamp"].startswith(converted):
            updated = entry.model_dump()
            updated["timestamp"] = e["timestamp"]
            data[i] = updated
            save_data(data)
            return {"message": f"Entry for {date} updated."}
    raise HTTPException(status_code=404, detail="No entry found for that date.")


# --- Analytics Endpoints ---

@app.get("/analytics")
def get_analytics():
    data = load_data()
    if not data:
        return {"message": "No entries yet."}
    recent_entry = data[-1]
    score = combined_score(recent_entry)
    state = mood_state(score)
    return {"score": score, "mood_state": state}

@app.get("/analytics/average")
def get_average():
    data = load_data()
    if not data:
        return {"message": "No entries yet."}
    avg = sum(combined_score(e) for e in data) / len(data)
    return {"average_score": round(avg, 2), "mood_state": mood_state(avg)}

@app.get("/analytics/streak")
def get_streak():
    from datetime import timedelta
    data = load_data()
    if not data:
        return {"streak": 0}
    dates = sorted(set(
        datetime.fromisoformat(e["timestamp"]).date() for e in data
    ))
    streak = 1
    for prev, curr in zip(dates, dates[1:]):
        if curr - prev == timedelta(days=1):
            streak += 1
        else:
            streak = 1
    return {"streak": streak}

@app.get("/analytics/by-date")
def get_by_date(days: int = 7):
    from datetime import timedelta
    data = load_data()
    cutoff = datetime.now().date() - timedelta(days=days)
    filtered = [
        e for e in data
        if datetime.fromisoformat(e["timestamp"]).date() >= cutoff
    ]
    return filtered
