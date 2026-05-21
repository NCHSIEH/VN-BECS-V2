import os
import re

directory = r"C:\Users\nchsi\Documents\GitHub\VN-BECS-V2\src"

replacements = [
    (r'bg-slate-900/50', 'bg-slate-50'),
    (r'bg-slate-900/40', 'bg-slate-50'),
    (r'bg-slate-950/50', 'bg-slate-50'),
    (r'bg-slate-950/80', 'bg-white/80'),
    (r'bg-slate-900', 'bg-white'),
    (r'bg-slate-950', 'bg-slate-50'),
    (r'border-slate-800', 'border-clinical-border'),
    (r'border-slate-700', 'border-slate-200'),
    (r'border-slate-800/30', 'border-clinical-border'),
    (r'border-slate-800/50', 'border-clinical-border'),
    (r'bg-\[#0b1120\]', 'bg-clinical-bg'),
    (r'bg-\[#020617\]', 'bg-clinical-bg'),
    (r'bg-slate-800', 'bg-slate-100'),
    (r'text-slate-400', 'text-slate-500'),
    (r'text-slate-300', 'text-slate-600'),
    (r'text-slate-200', 'text-slate-700'),
    (r'text-white', 'text-clinical-text'), 
    # Be careful with text-white, it might be used on colored backgrounds (like bg-rose-600)
    # We should use regex to only target text-white if not in a colored button... this is tricky.
]

# Refined replacements to avoid breaking text-white on primary buttons
refined_replacements = [
    (r'bg-slate-900/50', 'bg-slate-50'),
    (r'bg-slate-900/40', 'bg-slate-50'),
    (r'bg-slate-950/50', 'bg-slate-50'),
    (r'bg-slate-950/80', 'bg-white/80'),
    (r'bg-slate-900', 'bg-white'),
    (r'bg-slate-950', 'bg-slate-50'),
    (r'border-slate-800/50', 'border-slate-200'),
    (r'border-slate-800/30', 'border-slate-200'),
    (r'border-slate-800', 'border-clinical-border'),
    (r'border-slate-700', 'border-slate-200'),
    (r'bg-\[#0b1120\]', 'bg-clinical-bg'),
    (r'bg-\[#020617\]', 'bg-clinical-bg'),
    (r'bg-slate-800', 'bg-slate-100'),
    (r'text-slate-400', 'text-slate-500'),
    (r'text-slate-300', 'text-slate-600'),
    (r'text-slate-200', 'text-slate-700'),
    # for text-white, we will only replace it if it's accompanied by dark bgs (handled manually where possible or leave text-white alone if it's safe)
]

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(".tsx"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            
            original = content
            for pattern, repl in refined_replacements:
                content = re.sub(pattern, repl, content)
            
            if content != original:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Updated {file}")

print("Done.")
