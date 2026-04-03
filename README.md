# Mood Tracker
Built with Python 3.14

A command-line mood tracking app built specifically with Bipolar Disorder in mind. I built this because I have bipolar disorder and wanted a tool that actually reflected my experience — not just a generic mood logger. Log your daily mental health data, spot patterns over time, and export your data to share with a therapist or doctor.

---

## Features

- **Daily logging** — mood score, sleep, energy level, mania, psychosis, depression, intrusive thoughts, racing thoughts, irritability, and social withdrawal
- **Composite mood scoring** — calculates a weighted score across all symptoms to give a more accurate picture than mood alone
- **Mood state classification** — maps your score to one of five states: Suicidal, Depressed, Stable, Hypomanic, or Manic
- **Mixed state detection** — flags when racing thoughts and depression occur together, the highest risk pattern in bipolar disorder
- **Streak tracking** — tracks how many days in a row you've logged
- **Date range filtering** — view entries from the last N days
- **Data visualizations** — five charts built with matplotlib:
  - Mood over time
  - Average mood by day of the week
  - How you've been feeling (mood state distribution)
  - Sleep vs mood correlation
  - Sleep over time
- **CSV export** — export your data to share with a therapist or doctor
- **Local JSON storage** — all data stays on your machine

---

## Getting Started

**Install dependencies:**
```
pip install -r requirements.txt
```

**Clone this repository:**
```
git clone https://github.com/tristen-lee/Mood-Tracker.git
```

**Navigate to the project folder:**
```
cd Mood-Tracker
```

**Run the tracker:**
```
python -m core.tracker
```

---

## How It Works

Each daily entry is scored using a weighted system that factors in mood, energy, sleep, and symptom flags. That score maps to one of five mood states. Over time, the analytics track patterns so you can catch episodes early — before they escalate.

The mixed state flag is especially important. A combination of racing thoughts and depression is one of the most dangerous presentations in bipolar disorder and is often missed by simpler trackers.

---

## License

MIT License
