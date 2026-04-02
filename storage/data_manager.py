import json
import os

data_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data.json"))

def load_data():
    if not os.path.exists(data_path):
        return []
    try:
        with open(data_path, "r") as f:
            return json.load(f)
    except:
        return []


def save_data(data):
    with open(data_path, "w") as f:
        json.dump(data, f, indent=4)
    

def add_entry(entry):
    data = load_data()
    data.append(entry)
    save_data(data)
