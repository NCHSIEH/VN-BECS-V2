import os
import re

directory = r"C:\Users\nchsi\Documents\GitHub\VN-BECS-V2\src\components"

replacements = [
    # Background overrides
    (r'\bbg-white\b', 'bg-clinical-card'),
    (r'\bbg-slate-50\b', 'bg-clinical-bg'),
    (r'\bbg-slate-100\b', 'bg-clinical-bg'),
    (r'\bbg-slate-200\b', 'bg-clinical-border'),
    
    # Transparent background overrides
    (r'\bbg-white/10\b', 'bg-clinical-card/10'),
    (r'\bbg-white/20\b', 'bg-clinical-card/20'),
    (r'\bbg-white/30\b', 'bg-clinical-card/30'),
    (r'\bbg-white/40\b', 'bg-clinical-card/40'),
    (r'\bbg-white/50\b', 'bg-clinical-card/50'),
    (r'\bbg-white/60\b', 'bg-clinical-card/60'),
    (r'\bbg-white/70\b', 'bg-clinical-card/70'),
    (r'\bbg-white/80\b', 'bg-clinical-card/80'),
    (r'\bbg-white/90\b', 'bg-clinical-card/90'),
    
    (r'\bbg-slate-50/10\b', 'bg-clinical-bg/10'),
    (r'\bbg-slate-50/20\b', 'bg-clinical-bg/20'),
    (r'\bbg-slate-50/30\b', 'bg-clinical-bg/30'),
    (r'\bbg-slate-50/40\b', 'bg-clinical-bg/40'),
    (r'\bbg-slate-50/50\b', 'bg-clinical-bg/50'),
    
    # Border overrides
    (r'\bborder-slate-100\b', 'border-clinical-border'),
    (r'\bborder-slate-200\b', 'border-clinical-border'),
    (r'\bborder-slate-300\b', 'border-clinical-border'),
    (r'\bborder-white/[0-9]+\b', 'border-clinical-border'),
    
    # Text overrides
    (r'\btext-slate-900\b', 'text-clinical-text'),
    (r'\btext-slate-800\b', 'text-clinical-text'),
    (r'\btext-slate-700\b', 'text-clinical-text'),
    (r'\btext-slate-600\b', 'text-clinical-muted'),
    (r'\btext-slate-500\b', 'text-clinical-muted'),
    (r'\btext-slate-400\b', 'text-clinical-muted'),
    
    # Divide overrides
    (r'\bdivide-slate-100\b', 'divide-clinical-border'),
    (r'\bdivide-slate-200\b', 'divide-clinical-border'),
]

# We will skip ThemeSwitcher.tsx since it contains visual preview components that need actual color codes
skip_files = ["ThemeSwitcher.tsx", "BloodDropLogo.tsx"]

updated_files = []

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(".tsx") and file not in skip_files:
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            
            original = content
            for pattern, repl in replacements:
                content = re.sub(pattern, repl, content)
            
            if content != original:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)
                updated_files.append(file)

print(f"Theme harmonizer completed. Updated {len(updated_files)} files:")
for f in updated_files:
    print(f" - {f}")
