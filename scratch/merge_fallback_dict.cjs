const fs = require('fs');
const path = require('path');

try {
  const originalPath = path.resolve('scratch/original_i18n.tsx');
  const targetPath = path.resolve('src/lib/i18n.tsx');

  console.log('Reading files...');
  const originalContent = fs.readFileSync(originalPath, 'utf8');
  const targetContent = fs.readFileSync(targetPath, 'utf8');

  // Extract the original large dict block
  const startKeyword = 'const dict: Record<Language, Record<string, string>> = {';
  const startIndex = originalContent.indexOf(startKeyword);
  if (startIndex === -1) {
    throw new Error('Could not find const dict block in original_i18n.tsx');
  }

  // Find matching closing brace
  let openBraces = 1;
  let index = originalContent.indexOf('{', startIndex) + 1;
  let blockContent = '{';

  while (openBraces > 0 && index < originalContent.length) {
    const char = originalContent[index];
    if (char === '{') openBraces++;
    if (char === '}') openBraces--;
    blockContent += char;
    index++;
  }

  console.log(`Extracted original dict block. Length: ${blockContent.length} characters.`);

  // Prepare fallbackDict definition
  const fallbackDictReplacement = `const fallbackDict: Record<Language, Record<string, string>> = ${blockContent};`;

  // Find fallbackDict in targetContent
  const targetStartKeyword = 'const fallbackDict: Record<Language, Record<string, string>> = {';
  const targetStartIndex = targetContent.indexOf(targetStartKeyword);
  if (targetStartIndex === -1) {
    throw new Error('Could not find const fallbackDict block in src/lib/i18n.tsx');
  }

  // Find matching closing brace in targetContent
  let targetOpenBraces = 1;
  let targetIndex = targetContent.indexOf('{', targetStartIndex) + 1;

  while (targetOpenBraces > 0 && targetIndex < targetContent.length) {
    const char = targetContent[targetIndex];
    if (char === '{') targetOpenBraces++;
    if (char === '}') targetOpenBraces--;
    targetIndex++;
  }

  // Slice targetContent to replace the block
  const newTargetContent = 
    targetContent.substring(0, targetStartIndex) + 
    fallbackDictReplacement + 
    targetContent.substring(targetIndex);

  fs.writeFileSync(targetPath, newTargetContent, 'utf8');
  console.log('Successfully updated src/lib/i18n.tsx with complete fallbackDict!');
} catch (e) {
  console.error('Failed to merge fallbackDict:', e);
  process.exit(1);
}
