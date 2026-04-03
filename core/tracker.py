from storage.data_manager import add_entry, load_data
from datetime import datetime
import csv 
import matplotlib.pyplot as plt
plt.style.use("seaborn-v0_8")


def view_by_date_range():
    data = load_data()

    if not data:
        print("No entries found.")
        return

    while True:
        try:
            days = int(input("Show entries from the last how many days? "))
            if days > 0:
                break
            print("Please enter a number greater than 0.")
        except ValueError:
            print("Please enter a whole number.")

    from datetime import timedelta
    cutoff = datetime.now().date() - timedelta(days=days)

    results = []
    for entry in data:
        entry_date = datetime.fromisoformat(entry["timestamp"]).date()
        if entry_date >= cutoff:
            results.append(entry)

    if not results:
        print(f"No entries found in the last {days} days.")
        return

    for index, entry in enumerate(results, start=1):
        print(f"\nEntry {index}:")
        print("Timestamp:", entry['timestamp'])
        print("Sleep:", entry['sleep'])
        print("Mood-score:", entry['mood_score'])
        print("Mania:", entry['mania'])
        print("Psychosis:", entry['psychosis'])
        print("Depression:", entry['depression'])
        print("Intrusive Thoughts:", entry['intrusive_thoughts'])
        print("Racing Thoughts:", entry['racing_thoughts'])
        print("Irritability:", entry['irritability'])
        print("Energy Level:", entry['energy_level'])
        print("Social Withdrawal:", entry['social_withdrawal'])
        print("Notes:", entry['notes'])
        print("-" * 30)


def yes_no_to_bool(question):
    while True:
        answer = input(question + " (yes/no): ").strip().lower()
        if answer in ['yes', 'y']:
            return True
        elif answer in ['no', 'n']:
            return False
        else:
            print("Invalid response. Please type yes or no.")

def already_logged_today():
    data = load_data()
    today = datetime.now().date().isoformat()
    for entry in data:
        if entry["timestamp"].startswith(today):
            return True
    return False

def log_daily_entry():
    if already_logged_today():
        print("You already logged an entry today. Log another anyway? (yes/no): ", end="")
        if input().strip().lower() not in ["yes", "y"]:
            return

    while True:
        try:
            sleep_hours = int(input("How many hours did you sleep? Please use a numeric value. "))
            if 0 <= sleep_hours <= 24:
                break
            print("Please enter a number between 0 and 24.")
        except ValueError:
            print("Please enter a whole number.")
    while True:
        try:
            mood_value = int(input("How is your mood today, from a score of 1-10? "))
            if 1 <= mood_value <= 10:
                break
            print("Please enter a number between 1 and 10.")
        except ValueError:
            print("Please enter a whole number.")
    mania_value = yes_no_to_bool("Are you experiencing mania today?")
    psychosis_value = yes_no_to_bool("Are you experiencing psychosis today?")
    depression_value = yes_no_to_bool("Are you experiencing depression today?")
    intrusive_value = yes_no_to_bool("Are you having intrusive thoughts?")
    racing_thoughts_value = yes_no_to_bool("Are your thoughts racing?")
    irritability_value = yes_no_to_bool("Have you been more irritable than usual?")
    while True:
        try:
            energy_level = int(input("How energized were you today? Please use a numeric value. "))
            if 0 <= energy_level <= 10:
                break
            print("Please enter a number between 0 and 10.")
        except ValueError:
            print("Please enter a whole number.")
    social_withdrawal_value = yes_no_to_bool("Have you been withdrawing socially?")
    notes_value = input("Do you want to put any notes down?")
    daily_entry = {
        "timestamp": datetime.now().isoformat(),
        "sleep": sleep_hours,
        "mood_score": mood_value,
        "mania": mania_value, 
        "psychosis": psychosis_value, 
        "depression": depression_value,
        "intrusive_thoughts": intrusive_value,
        "racing_thoughts": racing_thoughts_value,
        "irritability": irritability_value,
        "energy_level": energy_level,
        "social_withdrawal": social_withdrawal_value,
        "notes": notes_value
        }
    add_entry(daily_entry)

def view_data():
    data = load_data()

    if not data:
        print("No entries found.")
        return

    for index, entry in enumerate(data, start=1):
        print(f"\nEntry {index}:")
        print("Timestamp:", entry['timestamp'])
        print("Sleep:", entry['sleep'])
        print("Mood-score:", entry['mood_score'])
        print("Mania:", entry['mania'])
        print("Psychosis:", entry['psychosis'])
        print("Depression:", entry['depression'])
        print("Intrusive Thoughts:", entry['intrusive_thoughts'])
        print("Racing Thoughts:", entry['racing_thoughts'])
        print("Irritability:", entry['irritability'])
        print("Energy Level:", entry['energy_level'])
        print("Social Withdrawal:", entry['social_withdrawal'])
        print("Notes:", entry['notes'])
        print("-" * 30)


def analytics_menu():
    while True:
        print("\n-- Analytics --")
        print("1. Average Mood")
        print("2. Streaks!")
        print("3. View by Date Range")
        print("4. Line Chart")
        print("5. Bar Chart")
        print("6. How Have You Been Feeling?")
        print("7. Does Sleep Affect Your Mood?")
        print("8. Your Sleep Over Time")
        print("9. Back")

        choice = input("Select an option: ")

        if choice == "1":
            average_mood()
        elif choice == "2":
            streak_tracking()
        elif choice == "3":
            view_by_date_range()
        elif choice == "4":
            line_chart()
        elif choice == "5":
            bar_chart()
        elif choice == "6":
            mood_state_distribution()
        elif choice == "7":
            scatter_plot()
        elif choice == "8":
            sleep_over_time()
        elif choice == "9":
            break

def main_menu():
    while True:
        print("\n-- Mood Tracker --")
        print("1. Log Entry")
        print("2. View Data")
        print("3. Analytics")
        print("4. Download Your Progress")
        print("5. Exit")

        choice = input("Select an option: ")

        if choice == "1":
            log_daily_entry()
        elif choice == "2":
            view_data()
        elif choice == "3":
            analytics_menu()
        elif choice == "4":
            data_export()
        elif choice == "5":
            break

def average_mood():
    data = load_data()

    if not data:
        print("No entries yet.")
        return

    total = 0

    for entry in data:
        total += combined_score(entry)

    avg = total / len(data)

    print(f'Average Composite Score: {avg:.2f}')
    print(f'Overall Mood State: {mood_state(avg)}')

    if avg <= 4:
        print("It seems like you may be in a very dark place. Please reach out to someone you trust.")
    elif 5 <= avg <= 9:
        print("It looks like you have been experiencing depression. Make sure to take time for self-care.")
    elif 10 <= avg <= 15:
        print("Your mood seems relatively stable. That's a solid baseline.")
    elif 16 <= avg <= 20:
        print("You've been running elevated lately. Keep monitoring your sleep and patterns.")
    else:
        print("Your mood has been very elevated. Stay mindful — reach out to your support system.")

    last_entry = data[-1]
    if last_entry["racing_thoughts"] and last_entry["depression"]:
        print("\n⚠ Mixed state detected in your last entry — this is a high risk pattern. Please reach out to someone you trust.")

    response = input("\nWould you like some practical tips based on your recent trends? (yes/no): ").strip().lower()

    if response in ["yes", "y"]:
        print("Tip: Track sleep consistently, write down triggers, and review patterns weekly.")
    elif response in ["no", "n"]:
        print("Alright. Staying aware is already progress.")
    else:
        print("Invalid response — skipping tips.")

def streak_tracking():
    data = load_data()

    if not data:
        print("No entries yet.")
        return

    dates = []
    for entry in data:
        parsed = datetime.fromisoformat(entry["timestamp"])
        dates.append(parsed.date())

    dates = sorted(dates)

    from datetime import timedelta
    streak = 1
    for prev, curr in zip(dates, dates[1:]):
        if curr - prev == timedelta(days=1):
            streak += 1
        else:
            streak = 1

    print(f"Your current logging streak is {streak} day(s).")

def data_export():
    data = load_data()
    with open('mood_data.csv', "w", newline="") as f:
        mood_writer = csv.DictWriter(f, fieldnames = ["timestamp",
            "sleep", "mood_score", "mania", "psychosis", "depression",
            "intrusive_thoughts", "racing_thoughts", "irritability",
            "energy_level", "social_withdrawal", "notes"])
        mood_writer.writeheader()
        for entry in data:
            mood_writer.writerow(entry)

## section for analytics - TL

def combined_score(entry):
    score = entry["mood_score"]
    if entry["depression"] == True:
        score -= 3
    if entry["intrusive_thoughts"] == True:
        score -= 2
    if entry["social_withdrawal"] == True:
        score -= 2
    if entry["mania"] == True:
        score += 4
    if entry["racing_thoughts"] == True:
        score += 2
    if entry["irritability"] == True:
        score += 1
    if entry["sleep"] <= 5:
         score += 2
    if entry["sleep"] <= 3:
        score += 2
    updated_score = score + entry["energy_level"]
    return updated_score

def mood_state(score):
    if score <= 4:
        combined_mood = "Suicidal"
    elif 5 <= score <= 9:
        combined_mood = "Depressed"
    elif 10 <= score <= 15:
        combined_mood = "Stable"
    elif  16 <= score <= 20:
        combined_mood = "Hypomanic"
    else:
        combined_mood = "Manic"
    return combined_mood








def line_chart():
    data = load_data()
    if not data:
        print("No entries yet.")
        return

    dates = []
    scores = []

    for entry in data:
        dates.append(datetime.fromisoformat(entry["timestamp"]).date())
        scores.append(combined_score(entry))

    plt.plot(dates, scores, marker="o")
    plt.title("Mood Over Time")
    plt.xlabel("Date")
    plt.ylabel("Mood Score (out of 24)")
    plt.gcf().autofmt_xdate()
    plt.tight_layout()
    plt.show()

def bar_chart():
    from collections import defaultdict
    data = load_data()
    if not data:
        print("No entries yet.")
        return

    day_scores = defaultdict(list)
    for entry in data:
        day = datetime.fromisoformat(entry["timestamp"]).strftime("%A")
        day_scores[day].append(combined_score(entry))

    days = []
    averages = []
    for day, score_list in day_scores.items():
        days.append(day)
        averages.append(sum(score_list) / len(score_list))

    plt.bar(days, averages)
    plt.title("Average Mood by Day of the Week")
    plt.xlabel("Day")
    plt.ylabel("Average Mood Score")
    plt.tight_layout()
    plt.show()


def mood_state_distribution():
    from collections import Counter
    data = load_data()
    if not data:
        print("No entries yet.")
        return

    states = [mood_state(combined_score(entry)) for entry in data]
    counts = Counter(states)

    labels = list(counts.keys())
    values = list(counts.values())

    plt.bar(labels, values, color=["#d9534f", "#f0ad4e", "#5bc0de", "#5cb85c", "#9b59b6"])
    plt.title("How Have You Been Feeling?")
    plt.xlabel("Mood State")
    plt.ylabel("Number of Days")
    plt.tight_layout()
    plt.show()

def scatter_plot():
    data = load_data()
    if not data:
        print("No entries yet.")
        return

    sleep_hours = [entry["sleep"] for entry in data]
    scores = [combined_score(entry) for entry in data]

    plt.scatter(sleep_hours, scores, alpha=0.7)
    plt.title("Does Sleep Affect Your Mood?")
    plt.xlabel("Hours of Sleep")
    plt.ylabel("Mood Score (out of 24)")
    plt.tight_layout()
    plt.show()

def sleep_over_time():
    data = load_data()
    if not data:
        print("No entries yet.")
        return

    dates = [datetime.fromisoformat(entry["timestamp"]).date() for entry in data]
    sleep_hours = [entry["sleep"] for entry in data]

    plt.plot(dates, sleep_hours, marker="o", color="steelblue")
    plt.title("Your Sleep Over Time")
    plt.xlabel("Date")
    plt.ylabel("Hours Slept")
    plt.gcf().autofmt_xdate()
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    main_menu()
