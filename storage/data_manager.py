import json
import os

def load_data():
    if not os.path.exists("data.json"):
        return []
    try:
        with open("data.json", "r") as f:
            return json.load(f)
    except:
        return []


def save_data(data):
    with open("data.json", "w") as f:
        return json.dump(data, f, indent=4)
    

def add_entry(entry):
    data = load_data()
    data.append(entry)
    save_data(data)
