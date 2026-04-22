from fastapi import FastAPI, HTTPException, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
from collections import defaultdict, Counter
from typing import Optional
import os
import anthropic
from db.database import get_connection
from db.auth import hash_password, verify_password, create_token, decode_token
from core.scoring import combined_score, mood_state

anthropic_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

app = FastAPI()

@app.get("/")
def health_check():
    return {"status": "ok"}

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
    medications_taken: Optional[list] = []

class MedicationBody(BaseModel):
    name: str

class JasperMessage(BaseModel):
    message: str
    history: Optional[list] = []


# --- Achievements ---

ACHIEVEMENTS = {
    "raw_stone": {
        "name": "Raw Stone",
        "emoji": "🪨",
        "description": "Logged your very first check-in.",
        "lore": "Every cairn starts with a single stone. You showed up. That's not small — that's a foundation. Raw, unpolished, real. The hardest part is starting, and you already did.",
        "quote": "Every cairn starts with a single stone.",
    },
    "amethyst": {
        "name": "Amethyst",
        "emoji": "🟣",
        "description": "7 total check-ins.",
        "lore": "A full week of checking in with yourself. Amethyst has been used for centuries to calm a racing mind and bring mental clarity. Seven days of data is seven days of self-knowledge. That matters.",
        "quote": "Clarity lives on the other side of chaos.",
    },
    "rose_quartz": {
        "name": "Rose Quartz",
        "emoji": "🩷",
        "description": "Logged a difficult symptom for the first time.",
        "lore": "Rose Quartz is the stone of self-acceptance — the gentle reminder that you deserve care, especially on the hard days. You've been giving yourself that care.",
        "quote": "Showing up for yourself is an act of love.",
    },
    "obsidian": {
        "name": "Obsidian",
        "emoji": "⚫",
        "description": "30 total check-ins.",
        "lore": "Obsidian is formed from volcanic fire. It's the stone of truth — it cuts through the noise and reveals what's really there. Thirty days of honest check-ins takes courage. You have it.",
        "quote": "A whole month of facing yourself honestly.",
    },
    "red_jasper": {
        "name": "Red Jasper",
        "emoji": "🔴",
        "description": "Talked to Jasper 5 times.",
        "lore": "Red Jasper is known as the stone of endurance — steady, grounding, unwavering. You kept coming back. That consistency is its own kind of strength.",
        "quote": "Endurance isn't glamorous. It's just showing up, again and again.",
    },
    "clear_quartz": {
        "name": "Clear Quartz",
        "emoji": "🌟",
        "description": "100 total check-ins.",
        "lore": "Clear Quartz amplifies everything around it. A hundred days of data, patterns, and self-awareness amplifies your ability to understand yourself like nothing else can. Stone by stone, you found your way.",
        "quote": "You built something real.",
    },
}

def award_achievements(user_id: int, entry_count: int, has_difficult: bool) -> list:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT achievement_id FROM user_achievements WHERE user_id = %s", (user_id,))
    earned = {row[0] for row in cur.fetchall()}

    to_award = []
    if entry_count >= 1 and "raw_stone" not in earned:
        to_award.append("raw_stone")
    if entry_count >= 7 and "amethyst" not in earned:
        to_award.append("amethyst")
    if entry_count >= 30 and "obsidian" not in earned:
        to_award.append("obsidian")
    if entry_count >= 100 and "clear_quartz" not in earned:
        to_award.append("clear_quartz")
    if has_difficult and "rose_quartz" not in earned:
        to_award.append("rose_quartz")

    for ach_id in to_award:
        cur.execute(
            "INSERT INTO user_achievements (user_id, achievement_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (user_id, ach_id)
        )

    conn.commit()
    conn.close()
    return [{"id": ach_id, **ACHIEVEMENTS[ach_id]} for ach_id in to_award]

def track_jasper_message(user_id: int):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE users SET jasper_message_count = COALESCE(jasper_message_count, 0) + 1 WHERE id = %s RETURNING jasper_message_count",
            (user_id,)
        )
        row = cur.fetchone()
        count = row[0] if row else 0
        if count >= 5:
            cur.execute(
                "SELECT 1 FROM user_achievements WHERE user_id = %s AND achievement_id = 'red_jasper'",
                (user_id,)
            )
            if not cur.fetchone():
                cur.execute(
                    "INSERT INTO user_achievements (user_id, achievement_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (user_id, "red_jasper")
                )
        conn.commit()
        conn.close()
    except Exception:
        pass


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


# --- Account ---

@app.delete("/account")
def delete_account(authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM entry_medications WHERE user_id = %s", (user_id,))
    cur.execute("DELETE FROM entries WHERE user_id = %s", (user_id,))
    cur.execute("DELETE FROM medications WHERE user_id = %s", (user_id,))
    cur.execute("DELETE FROM jasper_summaries WHERE user_id = %s", (user_id,))
    cur.execute("DELETE FROM user_achievements WHERE user_id = %s", (user_id,))
    cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
    conn.commit()
    conn.close()
    return {"message": "Account deleted."}


# --- User profile ---

@app.get("/me")
def get_me(authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    all_entries = fetch_entries(user_id)
    dates = sorted(set(e["timestamp"].date() for e in all_entries))
    streak = 0
    if dates:
        streak = 1
        for prev, curr in zip(dates, dates[1:]):
            if curr - prev == timedelta(days=1):
                streak += 1
            else:
                streak = 1
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT crystals FROM users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    conn.close()
    return {"streak": streak, "crystals": row[0] if row else 0}


# --- Medication Endpoints ---

@app.get("/medications")
def get_medications(authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name FROM medications WHERE user_id = %s ORDER BY id ASC", (user_id,))
    rows = cur.fetchall()
    conn.close()
    return [{"id": r[0], "name": r[1]} for r in rows]

@app.post("/medications")
def add_medication(body: MedicationBody, authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("INSERT INTO medications (user_id, name) VALUES (%s, %s) RETURNING id", (user_id, body.name.strip()))
    med_id = cur.fetchone()[0]
    conn.commit()
    conn.close()
    return {"id": med_id, "name": body.name.strip()}

@app.delete("/medications/{med_id}")
def delete_medication(med_id: int, authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM medications WHERE id = %s AND user_id = %s", (med_id, user_id))
    if cur.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Medication not found.")
    conn.commit()
    conn.close()
    return {"message": "Deleted."}


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
    cols = ["mood_score", "sleep", "energy_level", "mania", "psychosis", "depression",
            "intrusive_thoughts", "racing_thoughts", "irritability", "social_withdrawal",
            "notes", "timestamp"]
    entries = [dict(zip(cols, row)) for row in rows]
    cur.execute("""
        SELECT em.date, m.name FROM entry_medications em
        JOIN medications m ON em.medication_id = m.id
        WHERE em.user_id = %s
    """, (user_id,))
    med_rows = cur.fetchall()
    conn.close()
    med_map = defaultdict(list)
    for date, name in med_rows:
        med_map[date].append(name)
    for e in entries:
        e["medications_taken"] = med_map.get(e["timestamp"].date(), [])
    return entries

@app.post("/entries")
def create_entry(entry: Entry, authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id FROM entries WHERE user_id = %s AND timestamp::date = CURRENT_DATE",
        (user_id,)
    )
    if cur.fetchone():
        conn.close()
        raise HTTPException(status_code=409, detail="You've already checked in today. Go to My Entries to edit it.")
    cur.execute("""
        INSERT INTO entries (user_id, mood_score, sleep, energy_level, mania, psychosis,
            depression, intrusive_thoughts, racing_thoughts, irritability, social_withdrawal, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (user_id, entry.mood_score, entry.sleep, entry.energy_level, entry.mania,
          entry.psychosis, entry.depression, entry.intrusive_thoughts, entry.racing_thoughts,
          entry.irritability, entry.social_withdrawal, entry.notes))
    entry_date = datetime.now().date()
    if entry.medications_taken:
        for med_id in entry.medications_taken:
            cur.execute(
                "INSERT INTO entry_medications (user_id, date, medication_id) VALUES (%s, %s, %s)",
                (user_id, entry_date, med_id)
            )
    conn.commit()
    conn.close()
    score = combined_score(entry.model_dump())

    # Award crystals + check streak milestones
    all_entries = fetch_entries(user_id)
    dates = sorted(set(e["timestamp"].date() for e in all_entries))
    streak = 1
    for prev, curr in zip(dates, dates[1:]):
        if curr - prev == timedelta(days=1):
            streak += 1
        else:
            streak = 1

    MILESTONES = {3: 3, 7: 7, 14: 14, 30: 30, 60: 60, 100: 100}
    bonus = MILESTONES.get(streak, 0)
    crystals_earned = 1 + bonus

    conn2 = get_connection()
    cur2 = conn2.cursor()
    cur2.execute(
        "UPDATE users SET crystals = COALESCE(crystals, 0) + %s WHERE id = %s RETURNING crystals",
        (crystals_earned, user_id)
    )
    new_total = cur2.fetchone()[0]
    conn2.commit()
    conn2.close()

    # Check achievements
    total_entries = len(all_entries)
    has_difficult = entry.mania or entry.psychosis or entry.intrusive_thoughts
    new_achievements = award_achievements(user_id, total_entries, has_difficult)

    milestone_info = None
    if bonus > 0:
        CAIRN_LORE = {
            3:   {"name": "Pebble",        "emoji": "🪨",   "lore": "Three days in a row. Every cairn starts with a single stone — you just laid yours."},
            7:   {"name": "Stone",         "emoji": "🪨🪨", "lore": "Seven days. You're building something solid."},
            14:  {"name": "Rock",          "emoji": "🗿",   "lore": "Two weeks of showing up. The cairn is taking shape."},
            30:  {"name": "Boulder",       "emoji": "⛰️",  "lore": "Thirty days. A boulder of consistency. That's not easy — and you did it."},
            60:  {"name": "Cairn",         "emoji": "🏔️",  "lore": "Sixty days. You've built a cairn. Stone by stone, day by day."},
            100: {"name": "Ancient Cairn", "emoji": "✨",   "lore": "One hundred days. This cairn will stand for a long time. You built something real."},
        }
        milestone_info = {**CAIRN_LORE[streak], "streak": streak, "bonus": bonus}

    return {
        "message": "Entry logged successfully",
        "score": score,
        "mood_state": mood_state(score),
        "streak": streak,
        "crystals_earned": crystals_earned,
        "crystals_total": new_total,
        "milestone": milestone_info,
        "new_achievements": new_achievements,
    }

@app.patch("/entries")
def update_entry(date: str, entry: Entry, authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    try:
        converted = datetime.strptime(date, "%m/%d/%Y").strftime("%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Use MM/DD/YYYY format.")
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE entries SET mood_score=%s, sleep=%s, energy_level=%s, mania=%s, psychosis=%s,
            depression=%s, intrusive_thoughts=%s, racing_thoughts=%s, irritability=%s,
            social_withdrawal=%s, notes=%s
        WHERE user_id=%s AND timestamp::date=%s
    """, (entry.mood_score, entry.sleep, entry.energy_level, entry.mania, entry.psychosis,
          entry.depression, entry.intrusive_thoughts, entry.racing_thoughts, entry.irritability,
          entry.social_withdrawal, entry.notes, user_id, converted))
    if cur.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="No entry found for that date.")
    conn.commit()
    conn.close()
    score = combined_score(entry.model_dump())
    return {"message": "Entry updated.", "score": score, "mood_state": mood_state(score)}

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
        "DELETE FROM entry_medications WHERE user_id = %s AND date = %s",
        (user_id, converted)
    )
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
def get_by_day(days: int = 0, authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    data = fetch_entries(user_id)
    if not data:
        return []
    if days > 0:
        cutoff = datetime.now().date() - timedelta(days=days)
        data = [e for e in data if e["timestamp"].date() >= cutoff]
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
def get_mood_distribution(days: int = 0, authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    data = fetch_entries(user_id)
    if not data:
        return []
    if days > 0:
        cutoff = datetime.now().date() - timedelta(days=days)
        data = [e for e in data if e["timestamp"].date() >= cutoff]
    counts = Counter(mood_state(combined_score(e)) for e in data)
    return [{"state": state, "count": count} for state, count in counts.items()]

@app.get("/analytics/sleep-vs-mood")
def get_sleep_vs_mood(days: int = 0, authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    data = fetch_entries(user_id)
    if days > 0:
        cutoff = datetime.now().date() - timedelta(days=days)
        data = [e for e in data if e["timestamp"].date() >= cutoff]
    return [{"sleep": e["sleep"], "score": combined_score(e)} for e in data]

@app.get("/analytics/sleep-over-time")
def get_sleep_over_time(days: int = 0, authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    data = fetch_entries(user_id)
    if days > 0:
        cutoff = datetime.now().date() - timedelta(days=days)
        data = [e for e in data if e["timestamp"].date() >= cutoff]
    return [{"timestamp": e["timestamp"].isoformat(), "sleep": e["sleep"]} for e in data]

@app.get("/analytics/episode-risk")
def get_episode_risk(authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    data = fetch_entries(user_id)
    if len(data) < 7:
        return {"risk": "none", "message": "", "triggers": []}

    recent = data[-7:]
    scores = [combined_score(e) for e in recent]
    last = recent[-1]
    triggers = []

    # Mixed state — highest priority
    if last["racing_thoughts"] and last["depression"]:
        return {
            "risk": "mixed",
            "message": "Your last entry shows signs of a mixed state — racing thoughts alongside depression. This is a high-risk pattern. Please reach out to someone you trust.",
            "triggers": ["mixed state detected"]
        }

    # Check for consecutive low sleep
    sleep_values = [e["sleep"] for e in recent[-3:]]
    if all(s <= 5 for s in sleep_values):
        triggers.append("sleep under 5 hours for 3+ days")

    # Score trend over last 5 entries
    if len(scores) >= 5:
        trend = scores[-1] - scores[-5]
    else:
        trend = scores[-1] - scores[0]

    # Mania risk
    manic_flags = sum(1 for e in recent[-5:] if e["mania"] or e["racing_thoughts"])
    if trend >= 4 or (triggers and scores[-1] >= 16) or manic_flags >= 3:
        if trend >= 4:
            triggers.append("mood score rising")
        if manic_flags >= 3:
            triggers.append("elevated symptoms in recent entries")
        return {
            "risk": "mania",
            "message": "Your recent entries suggest an elevated episode may be approaching. Keep an eye on your sleep and reach out to your care team if things escalate.",
            "triggers": triggers
        }

    # Depression risk
    depressive_flags = sum(1 for e in recent[-5:] if e["depression"] or e["social_withdrawal"])
    if trend <= -4 or depressive_flags >= 3:
        if trend <= -4:
            triggers.append("mood score declining")
        if depressive_flags >= 3:
            triggers.append("depressive symptoms in recent entries")
        return {
            "risk": "depression",
            "message": "Your recent entries suggest a depressive episode may be approaching. Be gentle with yourself and consider reaching out to someone you trust.",
            "triggers": triggers
        }

    return {"risk": "none", "message": "", "triggers": []}


# --- Monthly Summary ---

@app.get("/analytics/monthly-summary")
def monthly_summary(authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    all_entries = fetch_entries(user_id)
    if not all_entries:
        return {"error": "no_data"}

    from datetime import date
    today = date.today()
    this_month = today.month
    this_year = today.year
    last_month = this_month - 1 if this_month > 1 else 12
    last_month_year = this_year if this_month > 1 else this_year - 1

    def entries_for(month, year):
        return [e for e in all_entries if e["timestamp"].month == month and e["timestamp"].year == year]

    def stats(entries):
        if not entries:
            return None
        scores = [combined_score(e) for e in entries]
        states = [mood_state(s) for s in scores]
        symptom_keys = ["mania", "depression", "racing_thoughts", "intrusive_thoughts", "irritability", "social_withdrawal", "psychosis"]
        symptom_counts = {k: sum(1 for e in entries if e.get(k)) for k in symptom_keys}
        state_counts = Counter(states)
        most_common_state = state_counts.most_common(1)[0][0]

        # best/worst week by avg combined score
        weeks = defaultdict(list)
        for e in entries:
            week_num = e["timestamp"].isocalendar()[1]
            weeks[week_num].append(combined_score(e))
        week_avgs = {w: sum(v)/len(v) for w, v in weeks.items()}
        best_week = max(week_avgs, key=week_avgs.get) if week_avgs else None
        worst_week = min(week_avgs, key=week_avgs.get) if week_avgs else None

        return {
            "entry_count": len(entries),
            "avg_mood": round(sum(e["mood_score"] for e in entries) / len(entries), 1),
            "avg_sleep": round(sum(e["sleep"] for e in entries) / len(entries), 1),
            "avg_energy": round(sum(e["energy_level"] for e in entries) / len(entries), 1),
            "avg_score": round(sum(scores) / len(scores), 1),
            "most_common_state": most_common_state,
            "symptom_counts": symptom_counts,
            "best_week_avg": round(week_avgs[best_week], 1) if best_week else None,
            "worst_week_avg": round(week_avgs[worst_week], 1) if worst_week else None,
        }

    this = entries_for(this_month, this_year)
    last = entries_for(last_month, last_month_year)

    if len(this) < 3:
        return {"error": "not_enough_data"}

    this_stats = stats(this)
    last_stats = stats(last)

    month_name = today.strftime("%B %Y")
    last_month_name = date(last_month_year, last_month, 1).strftime("%B")

    # Build AI summary using Haiku
    comparison = ""
    if last_stats:
        mood_dir = "up" if this_stats["avg_mood"] > last_stats["avg_mood"] else "down"
        sleep_dir = "up" if this_stats["avg_sleep"] > last_stats["avg_sleep"] else "down"
        comparison = f"Compared to {last_month_name}: mood is {mood_dir} ({last_stats['avg_mood']} → {this_stats['avg_mood']}), sleep is {sleep_dir} ({last_stats['avg_sleep']}h → {this_stats['avg_sleep']}h)."

    symptom_lines = ", ".join(f"{v} day(s) of {k.replace('_', ' ')}" for k, v in this_stats["symptom_counts"].items() if v > 0)

    ai_prompt = f"""You're a close friend texting someone about their month. You looked at their mental health data and want to give them a real, honest reflection — not a clinical report.

Write 3-4 sentences. Sound like a real person, not an app. Use casual language. Don't list stats robotically — weave them in naturally. Acknowledge the hard stuff without being dramatic about it. End on something grounding, not forced-positive. Plain text only, no markdown, no bullet points.

Their {month_name} ({this_stats['entry_count']} check-ins):
- Mood averaged {this_stats['avg_mood']}/10, usually feeling {this_stats['most_common_state'].lower()}
- Sleep averaged {this_stats['avg_sleep']} hours
- Energy averaged {this_stats['avg_energy']}/10
- Symptoms that showed up: {symptom_lines if symptom_lines else 'nothing flagged'}
{comparison}"""

    try:
        ai_result = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=250,
            messages=[{"role": "user", "content": ai_prompt}]
        )
        ai_summary = "\n".join(l for l in ai_result.content[0].text.splitlines() if not l.startswith("#")).strip()
    except Exception:
        ai_summary = ""

    return {
        "month": month_name,
        "this_month": this_stats,
        "last_month": last_stats,
        "ai_summary": ai_summary,
    }


# --- Jasper ---

def build_entry_context(entries):
    if not entries:
        return "No entries yet."
    recent = entries[-7:]
    lines = []
    for e in recent:
        date = e["timestamp"].strftime("%b %d")
        score = combined_score(e)
        state = mood_state(score)
        flags = [k for k in ["mania", "depression", "racing_thoughts", "intrusive_thoughts", "social_withdrawal", "irritability", "psychosis"] if e.get(k)]
        line = f"{date}: mood {e['mood_score']}/10, sleep {e['sleep']}h, energy {e['energy_level']}/10, state={state}"
        if flags:
            line += f", symptoms: {', '.join(flags)}"
        if e.get("notes"):
            line += f', notes: "{e["notes"]}"'
        lines.append(line)
    return "\n".join(lines)

def update_summary(user_id, user_message, jasper_response, old_summary):
    try:
        result = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content": f"""Previous summary: {old_summary or 'None'}

New exchange:
User: {user_message}
Jasper: {jasper_response}

Write a brief updated summary (under 150 words) capturing key info about this person's mental state, recurring themes, and anything worth remembering. Be factual and compassionate."""}]
        )
        new_summary = result.content[0].text
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO jasper_summaries (user_id, summary, updated_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (user_id) DO UPDATE SET summary = %s, updated_at = NOW()
        """, (user_id, new_summary, new_summary))
        conn.commit()
        conn.close()
    except Exception:
        pass

@app.post("/jasper")
def jasper_chat(body: JasperMessage, background_tasks: BackgroundTasks, authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)

    entries = fetch_entries(user_id)
    entry_context = build_entry_context(entries)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT name FROM users WHERE id = %s", (user_id,))
    name_row = cur.fetchone()
    user_name = name_row[0] if name_row else "friend"
    try:
        cur.execute("SELECT summary FROM jasper_summaries WHERE user_id = %s", (user_id,))
        summary_row = cur.fetchone()
        old_summary = summary_row[0] if summary_row else ""
    except Exception:
        old_summary = ""
    conn.close()

    crisis_flag = any(w in body.message.lower() for w in ["crisis", "suicidal", "end my life", "want to die", "hurt myself", "can't go on"])
    episode_risk = "none"
    if len(entries) >= 7:
        last = entries[-1]
        if last.get("racing_thoughts") and last.get("depression"):
            episode_risk = "mixed"

    crisis_note = ""
    if crisis_flag or episode_risk == "mixed":
        crisis_note = "\nIf this person seems to be in distress or mentions crisis, gently surface the 988 Suicide & Crisis Lifeline — warmly, like a friend, never clinical."

    system_prompt = f"""You are Jasper, a warm companion built into Cairn — a mental health tracking app for people with bipolar disorder. Some users don't have bipolar though.

Your personality: grounded, genuine, caring — like a trusted friend by a campfire. Never clinical, never robotic, never preachy. You listen more than you lecture. Keep responses conversational and warm — you're texting a friend, not writing a report. Short responses are usually better.

Rules:
- Never diagnose or give medical advice
- Never be dramatic or alarming
- You have their real check-in data — use it naturally, it's what makes you different from other chatbots
- If the user seems in crisis, gently mention 988 — always warm, never cold{crisis_note}

The user's name is {user_name}.

Their recent check-ins:
{entry_context}

What you remember about them:
{old_summary if old_summary else "This is your first conversation with them."}"""

    messages = list(body.history) + [{"role": "user", "content": body.message}]

    result = anthropic_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        system=system_prompt,
        messages=messages
    )

    response_text = result.content[0].text
    background_tasks.add_task(update_summary, user_id, body.message, response_text, old_summary)
    background_tasks.add_task(track_jasper_message, user_id)
    return {"response": response_text}


# --- Achievements endpoint ---

@app.get("/achievements")
def get_achievements(authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)

    # Snapshot before backfill
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT achievement_id FROM user_achievements WHERE user_id = %s", (user_id,))
    before = {row[0] for row in cur.fetchall()}
    conn.close()

    # Backfill entry-based achievements
    all_entries = fetch_entries(user_id)
    total_entries = len(all_entries)
    has_difficult = any(e.get("mania") or e.get("psychosis") or e.get("intrusive_thoughts") for e in all_entries)
    award_achievements(user_id, total_entries, has_difficult)

    # Backfill Red Jasper from jasper_message_count
    conn_j = get_connection()
    cur_j = conn_j.cursor()
    cur_j.execute("SELECT COALESCE(jasper_message_count, 0) FROM users WHERE id = %s", (user_id,))
    jcount = cur_j.fetchone()[0]
    if jcount >= 5:
        cur_j.execute(
            "INSERT INTO user_achievements (user_id, achievement_id) VALUES (%s, 'red_jasper') ON CONFLICT DO NOTHING",
            (user_id,)
        )
        cur_j.commit()
    conn_j.close()

    # Snapshot after backfill — diff tells us what was just awarded
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT achievement_id, earned_at FROM user_achievements WHERE user_id = %s", (user_id,))
    rows = cur.fetchall()
    conn.close()
    earned = {row[0]: row[1].isoformat() for row in rows}
    newly_awarded = [ach_id for ach_id in earned if ach_id not in before]

    return {
        "achievements": [
            {
                "id": ach_id,
                **ach,
                "earned": ach_id in earned,
                "earned_at": earned.get(ach_id),
            }
            for ach_id, ach in ACHIEVEMENTS.items()
        ],
        "newly_awarded": [{"id": ach_id, **ACHIEVEMENTS[ach_id]} for ach_id in newly_awarded],
    }
