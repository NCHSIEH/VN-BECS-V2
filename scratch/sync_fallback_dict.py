import re
import os
import json

sql_path = 'seed_data.sql'
i18n_path = 'src/lib/i18n.tsx'

# 1. Parse SQL file for translations
sql_keys = {'en': {}, 'zh-TW': {}, 'vi': {}}

with open(sql_path, 'r', encoding='utf-8') as f:
    for line_num, line in enumerate(f, 1):
        if 'INSERT INTO translations' in line:
            # Parse SQL insert format: VALUES ('key', 'lang', 'value')
            # Let's find first three single-quoted strings that are not preceded by a backslash, but actually SQL uses double single quotes for escaping.
            
            parts = []
            current = []
            in_str = False
            i = 0
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
                # Canonicalize lang
                if lang == 'zh-TW':
                    lang_key = 'zh-TW'
                elif lang == 'en':
                    lang_key = 'en'
                elif lang == 'vi':
                    lang_key = 'vi'
                else:
                    continue
                
                sql_keys[lang_key][key] = value

print(f"Parsed from SQL: en={len(sql_keys['en'])}, zh-TW={len(sql_keys['zh-TW'])}, vi={len(sql_keys['vi'])}")

# 2. Format fallbackDict as TS string
def format_dict_to_ts(d):
    lines = []
    # Sort keys for clean git diff
    for k in sorted(d.keys()):
        val = d[k]
        # Escape value for JS string
        # Replace backslashes first, then newlines, then double quotes
        escaped_val = val.replace('\\', '\\\\').replace('\n', '\\n').replace('\r', '').replace('"', '\\"')
        lines.append(f'    "{k}": "{escaped_val}",')
    return "\n".join(lines)

fallback_dict_ts = f"""const fallbackDict: Record<Language, Record<string, string>> = {{
  en: {{
{format_dict_to_ts(sql_keys['en'])}
  }},
  'zh-TW': {{
{format_dict_to_ts(sql_keys['zh-TW'])}
  }},
  vi: {{
{format_dict_to_ts(sql_keys['vi'])}
  }}
}};"""

# 3. Read i18n.tsx and locate fallbackDict
with open(i18n_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find start of const fallbackDict
dict_start_idx = content.find('const fallbackDict: Record<Language, Record<string, string>> = {')
if dict_start_idx == -1:
    print("Error: Could not find fallbackDict start in i18n.tsx")
    exit(1)

# Find matching closing bracket for fallbackDict
# We'll parse matching braces starting from the opening brace after '='
brace_count = 0
found_start = False
dict_end_idx = -1

for idx in range(dict_start_idx, len(content)):
    c = content[idx]
    if c == '{':
        brace_count += 1
        found_start = True
    elif c == '}':
        brace_count -= 1
        if found_start and brace_count == 0:
            dict_end_idx = idx + 1
            break

if dict_end_idx == -1:
    print("Error: Could not find matching closing bracket for fallbackDict")
    exit(1)

# Replace the old fallbackDict with the new one
new_content = content[:dict_start_idx] + fallback_dict_ts + content[dict_end_idx:]

with open(i18n_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully synchronized fallbackDict in i18n.tsx with seed_data.sql!")
