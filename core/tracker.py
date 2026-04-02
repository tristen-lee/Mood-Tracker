from storage.data_manager import add_entry, load_data
from datetime import datetime

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
        print("Suicidal Thoughts:", entry['suicidal_thoughts'])
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
    mania_value = yes_no_to_bool("Are you experiencing mania?")
    psychosis_value = yes_no_to_bool("If so, do you feel symptoms of psychosis?")
    depression_value = yes_no_to_bool("Are you experiencing depression today?")
    suicidal_value = yes_no_to_bool("If so, do you feel suicidal?")
    notes_value = input("Do you want to put any notes down?")
    daily_entry = {
        "timestamp": datetime.now().isoformat(),
        "sleep": sleep_hours,
        "mood_score": mood_value,
        "mania": mania_value, 
        "psychosis": psychosis_value, 
        "depression": depression_value,
        "suicidal_thoughts": suicidal_value,
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
        print("Suicidal Thoughts:", entry['suicidal_thoughts'])
        print("Notes:", entry['notes'])
        print("-" * 30)


def main_menu():
    while True:
        print("1. Log Entry")
        print("2. View Data")
        print("3. Show Average Mood")
        print("4. View by Date Range")
        print("5. Streak Tracking")
        print("6. Exit")

        choice = input("Select an option: ")

        if choice == "1":
            log_daily_entry()
        elif choice == "2":
            view_data()
        elif choice == "3":
            average_mood()
        elif choice == "4":
            view_by_date_range()
        elif choice == "5":
            streak_tracking()
        elif choice == "6":
            break

def average_mood():
    data = load_data()

    if not data:
        print("No entries yet.")
        return

    total = 0

    for entry in data:
        total += entry["mood_score"]

    avg = total / len(data)

    print(f'Average Mood: {avg:.2f}')
    if avg < 4:
        print("It seems like you may be experiencing depression. It might help to slow down and check in with yourself.")
    elif 4 <= avg < 6:
        print("I've noticed you have been feeling a little down. Make sure to take time for self-care!")
    elif 6 <= avg < 8:
        print("Your mood seems relatively stable. That’s a solid baseline.")
    elif 8 <= avg < 9.5:
        print("You are feeling really good lately. Keep monitoring your patterns.")
    else:
        print("Your mood has been very elevated. Stay mindful of your sleep patterns!")

    response = input("Would you like some practical tips based on your recent trends? (yes/no): ").strip().lower()

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

if __name__ == "__main__":
    main_menu()
