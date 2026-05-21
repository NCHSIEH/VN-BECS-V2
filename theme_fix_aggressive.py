import os
import re

directory = r"C:\Users\nchsi\Documents\GitHub\VN-BECS-V2\src"

# Very aggressive replacement patterns to remove all traces of dark UI
patterns = [
    # Backgrounds
    (r'bg-slate-900/[0-9]+', 'bg-white'),
    (r'bg-slate-950/[0-9]+', 'bg-white'),
    (r'bg-slate-900', 'bg-white'),
    (r'bg-slate-950', 'bg-slate-50'),
    (r'bg-\[#0b1120\]', 'bg-clinical-bg'),
    (r'bg-\[#020617\]', 'bg-clinical-bg'),
    (r'bg-black/[0-9]+', 'bg-slate-100'),
    (r'bg-black', 'bg-slate-50'),
    
    # Borders
    (r'border-slate-800/[0-9]+', 'border-clinical-border'),
    (r'border-slate-900/[0-9]+', 'border-clinical-border'),
    (r'border-slate-800', 'border-clinical-border'),
    (r'border-slate-900', 'border-clinical-border'),
    (r'border-slate-700', 'border-slate-200'),
    (r'border-white/[0-9]+', 'border-clinical-border'),
    
    # Divides
    (r'divide-slate-800/[0-9]+', 'divide-slate-200'),
    (r'divide-slate-900/[0-9]+', 'divide-slate-200'),
    (r'divide-slate-800', 'divide-slate-200'),
    (r'divide-slate-900', 'divide-slate-200'),
    
    # Text colors
    (r'text-slate-400', 'text-slate-500'),
    (r'text-slate-300', 'text-slate-600'),
    (r'text-slate-200', 'text-slate-700'),
    
    # Shadows (remove dark heavy shadows)
    (r'shadow-black/[0-9]+', 'shadow-sm'),
    (r'shadow-\[0_20px_60px_rgba\(0\,0\,0\,0\.6\)\]', 'shadow-xl'),
    (r'shadow-\[0_0_150px_rgba\(0\,0\,0\,1\)\]', 'shadow-2xl'),
]

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(".tsx"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            
            original = content
            for pattern, repl in patterns:
                content = re.sub(pattern, repl, content)
            
            # Special case for text-white in tables
            # We don't want to replace text-white in buttons. We know buttons use classes like bg-rose-600 text-white
            # So a global replacement is dangerous. We will leave text-white alone but hope bg-white takes over.
            
            if content != original:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Updated {file}")

print("Done.")
