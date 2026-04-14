from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
from collections import defaultdict, Counter
from typing import Optional
from db.database import get_connection
from db.auth import hash_password, verify_password, create_token, decode_token
from core.scoring import combined_score, mood_state

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Models ---

class RegisterBody(BaseModel):
    name: str
    email: str
    password: str

class LoginBody(BaseModel):
    email: str
    password: str

class Entry(BaseModel):
    sleep: int
    mood_score: int
    energy_level: int
    mania: bool
    psychosis: bool
    depression: bool
    intrusive_thoughts: bool
    racing_thoughts: bool
    irritability: bool
    social_withdrawal: bool
    notes: str


# --- Auth helper ---

def get_user_id(authorization: Optional[str]) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not logged in.")
    token = authorization.split(" ")[1]
    try:
        return decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


# --- Auth Endpoints ---

@app.post("/register")
def register(body: RegisterBody):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE email = %s", (body.email,))
    if cur.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered.")
    hashed = hash_password(body.password)
    cur.execute(
        "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s) RETURNING id",
        (body.name, body.email, hashed)
    )
    user_id = cur.fetchone()[0]
    conn.commit()
    conn.close()
    token = create_token(user_id)
    return {"token": token, "name": body.name}

@app.post("/login")
def login(body: LoginBody):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name, password_hash FROM users WHERE email = %s", (body.email,))
    row = cur.fetchone()
    conn.close()
    if not row or not verify_password(body.password, row[2]):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    token = create_token(row[0])
    return {"token": token, "name": row[1]}


# --- Entry Endpoints ---

@app.get("/entries")
def get_entries(authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT mood_score, sleep, energy_level, mania, psychosis, depression,
               intrusive_thoughts, racing_thoughts, irritability, social_withdrawal,
               notes, timestamp
        FROM entries WHERE user_id = %s ORDER BY timestamp ASC
    """, (user_id,))
    rows = cur.fetchall()
    conn.close()
    cols = ["mood_score", "sleep", "energy_level", "mania", "psychosis", "depression",
            "intrusive_thoughts", "racing_thoughts", "irritability", "social_withdrawal",
            "notes", "timestamp"]
    return [dict(zip(cols, row)) for row in rows]

@app.post("/entries")
def create_entry(entry: Entry, authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO entries (user_id, mood_score, sleep, energy_level, mania, psychosis,
            depression, intrusive_thoughts, racing_thoughts, irritability, social_withdrawal, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (user_id, entry.mood_score, entry.sleep, entry.energy_level, entry.mania,
          entry.psychosis, entry.depression, entry.intrusive_thoughts, entry.racing_thoughts,
          entry.irritability, entry.social_withdrawal, entry.notes))
    conn.commit()
    conn.close()
    return {"message": "Entry logged successfully"}

@app.delete("/entries")
def delete_entry(date: str, authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    try:
        converted = datetime.strptime(date, "%m/%d/%Y").strftime("%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Use MM/DD/YYYY format.")
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM entries WHERE user_id = %s AND timestamp::date = %s",
        (user_id, converted)
    )
    if cur.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="No entry found for that date.")
    conn.commit()
    conn.close()
    return {"message": f"Entry for {date} deleted."}


# --- Analytics Endpoints ---

def fetch_entries(user_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT mood_score, sleep, energy_level, mania, psychosis, depression,
               intrusive_thoughts, racing_thoughts, irritability, social_withdrawal,
               notes, timestamp
        FROM entries WHERE user_id = %s ORDER BY timestamp ASC
    """, (user_id,))
    rows = cur.fetchall()
    conn.close()
    cols = ["mood_score", "sleep", "energy_level", "mania", "psychosis", "depression",
            "intrusive_thoughts", "racing_thoughts", "irritability", "social_withdrawal",
            "notes", "timestamp"]
    return [dict(zip(cols, row)) for row in rows]

@app.get("/analytics")
def get_analytics(authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    data = fetch_entries(user_id)
    if not data:
        return {"message": "No entries yet."}
    recent = data[-1]
    score = combined_score(recent)
    return {"score": score, "mood_state": mood_state(score)}

@app.get("/analytics/average")
def get_average(authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    data = fetch_entries(user_id)
    if not data:
        return {"message": "No entries yet."}
    avg = sum(combined_score(e) for e in data) / len(data)
    return {"average_score": round(avg, 2), "mood_state": mood_state(avg)}

@app.get("/analytics/streak")
def get_streak(authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    data = fetch_entries(user_id)
    if not data:
        return {"streak": 0}
    dates = sorted(set(e["timestamp"].date() for e in data))
    streak = 1
    for prev, curr in zip(dates, dates[1:]):
        if curr - prev == timedelta(days=1):
            streak += 1
        else:
            streak = 1
    return {"streak": streak}

@app.get("/analytics/by-date")
def get_by_date(days: int = 30, authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    data = fetch_entries(user_id)
    cutoff = datetime.now().date() - timedelta(days=days)
    return [e for e in data if e["timestamp"].date() >= cutoff]

@app.get("/analytics/by-day")
def get_by_day(authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    data = fetch_entries(user_id)
    if not data:
        return []
    day_scores = defaultdict(list)
    for e in data:
        day = e["timestamp"].strftime("%A")
        day_scores[day].append(combined_score(e))
    order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    return [
        {"day": day, "average": round(sum(day_scores[day]) / len(day_scores[day]), 2)}
        for day in order if day in day_scores
    ]

@app.get("/analytics/mood-distribution")
def get_mood_distribution(authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    data = fetch_entries(user_id)
    if not data:
        return []
    counts = Counter(mood_state(combined_score(e)) for e in data)
    return [{"state": state, "count": count} for state, count in counts.items()]

@app.get("/analytics/sleep-vs-mood")
def get_sleep_vs_mood(authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    data = fetch_entries(user_id)
    return [{"sleep": e["sleep"], "score": combined_score(e)} for e in data]

@app.get("/analytics/sleep-over-time")
def get_sleep_over_time(authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    data = fetch_entries(user_id)
    return [{"timestamp": e["timestamp"].isoformat(), "sleep": e["sleep"]} for e in data]
