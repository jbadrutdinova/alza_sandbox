import json
from path import Path

def get_project_root():
    return str(Path(__file__).parent.parent)

def save_json(data, path):
    with open(path, mode='w') as file:
        json.dump(data, file)

def read_json(path):
    with open(path, mode='r') as file:
        return json.load(file)
