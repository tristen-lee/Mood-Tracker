from storage.data_manager import add_entry, load_data
from datetime import datetime

def yes_no_to_bool(question):
    while True:
        answer = input(question + " (yes/no): ").strip().lower()
        if answer in ['yes', 'y']:
            return True
        elif answer in ['no', 'n']:
            return False
        else:
            print("Invalid response. Please type yes or no.")

def log_daily_entry():
    while True:
        try:
            sleep_hours = int(input("How many hours did you sleep? Please use a numeric value. "))
            break
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
        print("4. Exit")

        choice = input("Select an option: ")

        if choice == "1":
            log_daily_entry()
        elif choice == "2":
            view_data()
        elif choice == "3":
            average_mood()
        elif choice == "4":
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

if __name__ == "__main__":
    main_menu()