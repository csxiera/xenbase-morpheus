import csv

def get_min_max(file_path, column_name):
    values = []

    with open(file_path, newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            try:
                value = float(row[column_name])
                values.append(value)
            except (ValueError, KeyError):
                continue  # Skip rows with missing or non-numeric data

    if not values:
        print(f"No valid numeric data found in column '{column_name}'.")
        return None, None

    return min(values), max(values)

def scale(data, min_val, max_val):
    x_min = min(data)
    x_max = max(data)
    scale_range = max_val - min_val
    return [min_val + ((x - x_min) * scale_range / (x_max - x_min)) for x in data]


#scaled_data = scale(data, -2, 2)
#print(scaled_data)

file_path = 'DEG-GSE103240.csv'
column_name = 'LogFC'  # Replace with your actual column name
min_val, max_val = get_min_max(file_path, column_name)

print(f"Lowest value in '{column_name}': {min_val}")
print(f"Highest value in '{column_name}': {max_val}")