const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('Extracting original i18n.tsx from git as a binary buffer to prevent corruption...');
  const buffer = execSync('git show HEAD:src/lib/i18n.tsx');
  const targetPath = path.resolve('scratch/original_i18n.tsx');
  fs.writeFileSync(targetPath, buffer);
  console.log('Successfully wrote original i18n.tsx to scratch/original_i18n.tsx with perfect binary encoding!');
} catch (e) {
  console.error('Failed to extract i18n.tsx from git:', e);
  process.exit(1);
}
