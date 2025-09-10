import csv
import json

csv_file = 'D:/fpl/fpl-simulator/data/2024-25/cleaned_players.csv'
json_file = 'D:/fpl/fpl-simulator/public/cleaned_players.json'

with open(csv_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    data = list(reader)

with open(json_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)
