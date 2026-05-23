import re
import os

sql_path = 'seed_data.sql'
i18n_path = 'src/lib/i18n.tsx'

# Parse SQL file
insert_pattern = re.compile(
    r"INSERT\s+INTO\s+translations\s*\((?:key|lang|value|\s|,)+\)\s*VALUES\s*\(\s*'(.*?)'\s*,\s*'(.*?)'\s*,\s*'(.*?)'\s*\)",
    re.IGNORECASE
)

# Escape single quotes and handle SQL escaped characters
# Note: SQL strings use '' to escape single quotes, let's handle that.
sql_keys = {}

with open(sql_path, 'r', encoding='utf-8') as f:
    for line_num, line in enumerate(f, 1):
        if 'INSERT INTO translations' in line:
            # We want to extract the parts carefully.
            # SQL string escapes: '' -> '
            # Since regex with simple single quote might fail if there are escaped quotes, let's use a robust parser
            # E.g. VALUES ('key', 'lang', 'value')
            # Let's find first three single-quoted strings that are not preceded by a backslash, but actually SQL uses double single quotes for escaping.
            
            # Simple SQL string parser:
            parts = []
            current = []
            in_str = False
            i = 0
            # Look inside the VALUES (...) part
            val_start = line.find('VALUES')
            if val_start == -1:
                continue
            val_str = line[val_start:]
            
            while i < len(val_str):
                c = val_str[i]
                if c == "'":
                    if in_str:
                        # Check if next char is also a single quote (SQL escape)
                        if i + 1 < len(val_str) and val_str[i+1] == "'":
                            current.append("'")
                            i += 2
                            continue
                        else:
                            in_str = False
                            parts.append("".join(current))
                            current = []
                    else:
                        in_str = True
                elif in_str:
                    current.append(c)
                i += 1
            
            if len(parts) >= 3:
                key, lang, value = parts[0], parts[1], parts[2]
                if lang not in sql_keys:
                    sql_keys[lang] = {}
                sql_keys[lang][key] = value

print("Languages found in SQL:", list(sql_keys.keys()))
for lang, kvs in sql_keys.items():
    print(f"  {lang}: {len(kvs)} keys")

# Check which ones are in i18n_path
import sys
sys.path.append('.')
