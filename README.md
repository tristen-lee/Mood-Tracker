# Cairn — Daily Mental Health Check-In

A mental health tracking app built specifically for bipolar disorder. I built this because I have bipolar and wanted a tool that actually reflected my experience — not a generic mood logger.

Live at: [tristen-lee.github.io/Mood-Tracker](https://tristen-lee.github.io/Mood-Tracker)

---

## What it does

**Daily check-ins** — Log mood (1–10), hours of sleep, energy level, and 7 symptom flags (mania, psychosis, depression, intrusive thoughts, racing thoughts, irritability, social withdrawal). Medications are tracked per check-in. A weighted composite scoring algorithm maps all inputs to one of five mood states: Crisis, Depressed, Stable, Hypomanic, or Manic.

**Episode warning system** — Analyzes the rolling 7-entry window and detects mania, depression, and mixed-state risk patterns. A warning card appears on the dashboard before things get bad.

**Jasper** — An AI companion powered by Claude Sonnet. Jasper reads the user's recent check-in data before every conversation and uses it naturally in conversation. A rolling summary is maintained across sessions using Claude Haiku (cheap, fast) so Jasper remembers context without storing full conversation history. Conversation persists in localStorage between sessions.

**Analytics** — Mood over time, average by day of week, mood state distribution, sleep vs mood scatter, sleep over time. Built with Chart.js, fully theme-aware.

**Monthly summary** — This month vs last month: avg mood, sleep, energy, check-ins, most common mood state, symptom breakdown. Haiku generates a short plain-English paragraph summarizing the month.

**Medication tracking** — Add medications in Settings, check them off each check-in. Stored in a junction table keyed by user + date.

**CSV export** — Full entry history exported as a CSV, framed as "Download for my therapist."

**Edit & delete entries** — Full CRUD on past entries via a modal edit form.

**Onboarding** — First-time walkthrough explaining every field, mood state, and how to add medications.

**PWA** — Installable via "Add to Home Screen" on iOS and Android. Includes manifest and service worker.

**Theming** — Dark / Light / System. Applied synchronously before paint via an inline `theme.js` script in `<head>` to prevent flash of unstyled content. CSS custom properties handle all color switching.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vanilla HTML / CSS / JS |
| Hosting | GitHub Pages (`docs/`) |
| Backend | Python FastAPI |
| Backend hosting | Render |
| Database | PostgreSQL on Supabase |
| Auth | JWT (365-day expiry), bcrypt password hashing |
| AI | Anthropic API — Claude Sonnet 4.6 (Jasper chat), Claude Haiku 4.5 (summaries) |
| Charts | Chart.js |

---

## Architecture notes

**Composite mood scoring** (`core/scoring.py`) — mood state isn't just the raw mood slider. It's a weighted algorithm combining mood score, sleep, energy, and symptom flags into a single score that maps to a clinical-adjacent state. This is what powers the episode warning system and Jasper's context.

**Jasper memory** — Storing full conversation history per user would be expensive and slow. Instead, a rolling summary (~150 words) is generated after each exchange using Haiku and stored in `jasper_summaries`. The summary is injected into the system prompt alongside recent entry data. Jasper has context without the cost.

**JWT auth** — Tokens are stored in localStorage with a 365-day expiry. No refresh token flow — the app is designed for personal daily use, not enterprise auth.

**Medication junction table** — Medications are stored as `user_id + date` keys in `entry_medications`, not embedded in the entries table. This avoids schema migrations when medication tracking was added later.

**FOUC prevention** — `theme.js` runs synchronously in `<head>` before any content renders. It reads localStorage and sets `data-theme` on `<html>` immediately, so the correct theme is applied before first paint.

---

## Project structure

```
mood_tracker/
├── api/
│   └── main.py           # FastAPI app — all endpoints
├── core/
│   └── scoring.py        # combined_score() and mood_state()
├── db/
│   ├── database.py       # get_connection()
│   └── auth.py           # JWT, password hashing
├── docs/                 # Frontend (GitHub Pages)
│   ├── home.html/js      # Landing page + login/register
│   ├── dashboard.html/js # Main dashboard + episode warning
│   ├── log.html/js       # Daily check-in form
│   ├── entries.html/js   # Entry history + CSV export + edit
│   ├── analytics.html/js # Charts
│   ├── summary.html/js   # Monthly summary + AI paragraph
│   ├── jasper.html/js    # AI companion chat
│   ├── settings.html/js  # Theme + medications + display name
│   ├── onboarding.html   # First-time user flow
│   ├── help.html         # Field reference
│   ├── style.css         # All styles + CSS variables for theming
│   └── theme.js          # Applies theme before paint
└── requirements.txt
```

---

## Running locally

```bash
pip install -r requirements.txt
uvicorn api.main:app --reload
```

Set a `DATABASE_URL` environment variable pointing to your Postgres instance and `ANTHROPIC_API_KEY` for Jasper.

---

## License

MIT
