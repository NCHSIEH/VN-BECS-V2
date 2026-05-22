import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('CRITICAL: Supabase environment variables are missing in .env!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const i18nFilePath = path.resolve('src/lib/i18n.tsx');
const seedFilePath = path.resolve('seed_data.sql');

async function main() {
  console.log('Reading i18n.tsx...');
  const content = fs.readFileSync(i18nFilePath, 'utf8');

  // Locate the dict block
  const dictStartIndex = content.indexOf('const dict: Record<Language, Record<string, string>> = {');
  if (dictStartIndex === -1) {
    console.error('Could not find dict block in i18n.tsx');
    process.exit(1);
  }

  // Extract translation objects for each language
  const languages = ['en', 'zh-TW', 'vi'];
  const translationsToSync = [];

  for (const lang of languages) {
    console.log(`Extracting translations for language: ${lang}`);
    
    // Find the starting point of the language dictionary
    // Handles single quotes, double quotes or raw keys (e.g. en: {, 'zh-TW': {, vi: {)
    let langKeyIndex = content.indexOf(`${lang}: {`, dictStartIndex);
    if (langKeyIndex === -1) {
      langKeyIndex = content.indexOf(`'${lang}': {`, dictStartIndex);
    }
    if (langKeyIndex === -1) {
      langKeyIndex = content.indexOf(`"${lang}": {`, dictStartIndex);
    }

    if (langKeyIndex === -1) {
      console.warn(`Could not find dictionary for language: ${lang}`);
      continue;
    }

    // Find the end of this language's dictionary block
    let openBraces = 1;
    let index = content.indexOf('{', langKeyIndex) + 1;
    let blockContent = '';

    while (openBraces > 0 && index < content.length) {
      const char = content[index];
      if (char === '{') openBraces++;
      if (char === '}') openBraces--;
      if (openBraces > 0) blockContent += char;
      index++;
    }

    // Regular expression to parse "key: 'value'" or "key: \"value\"" (handling double and single quotes and backslash escapes)
    const entryRegex = /([a-zA-Z0-9_-]+):\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
    let match;
    let count = 0;

    while ((match = entryRegex.exec(blockContent)) !== null) {
      const key = match[1];
      let value = match[2] !== undefined ? match[2] : match[3];
      
      // Clean up escape characters
      value = value.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\n/g, '\n');

      translationsToSync.push({ key, lang, value });
      count++;
    }
    console.log(`Extracted ${count} translations for ${lang}`);
  }

  console.log(`Total translations extracted: ${translationsToSync.length}`);

  if (translationsToSync.length === 0) {
    console.error('No translations extracted. Check regex matching.');
    process.exit(1);
  }

  // 1. Syncing directly to Supabase via DB Client
  console.log('Syncing translations to active Supabase development database...');
  
  // Upsert in batches of 100 to avoid query size limits
  const batchSize = 100;
  for (let i = 0; i < translationsToSync.length; i += batchSize) {
    const batch = translationsToSync.slice(i, i + batchSize);
    console.log(`Uploading batch ${i / batchSize + 1} (${batch.length} items)...`);
    
    const { error } = await supabase
      .from('translations')
      .upsert(batch, { onConflict: 'key,lang' });

    if (error) {
      console.error('Supabase upload error details:', error);
      console.error('Make sure the "translations" table is created in your database first!');
      console.warn('Will continue generating SQL file statements...');
      break;
    }
  }
  console.log('Database upload sync complete.');

  // 2. Generating SQL seed insert statements and appending to seed_data.sql
  console.log('Generating SQL Insert Statements for seed_data.sql...');
  
  // Clean up existing translation inserts in seed_data.sql if any, or just append
  let seedContent = fs.readFileSync(seedFilePath, 'utf8');
  
  // Remove existing translations block if we've appended before
  const markerStart = '-- --- AUTO GENERATED TRANSLATIONS START ---';
  const markerEnd = '-- --- AUTO GENERATED TRANSLATIONS END ---';
  
  const markerStartIndex = seedContent.indexOf(markerStart);
  if (markerStartIndex !== -1) {
    const markerEndIndex = seedContent.indexOf(markerEnd) + markerEnd.length;
    seedContent = seedContent.substring(0, markerStartIndex) + seedContent.substring(markerEndIndex);
  }

  // Build the SQL inserts block
  let sqlBlock = `\n${markerStart}\n-- 8. Translations (Dynamic Multi-language)\n`;
  
  // Let's escape single quotes for SQL insertion
  const sqlInserts = translationsToSync.map(t => {
    const escapedValue = t.value.replace(/'/g, "''");
    return `INSERT INTO translations (key, lang, value) VALUES ('${t.key}', '${t.lang}', '${escapedValue}') ON CONFLICT (key, lang) DO UPDATE SET value = EXCLUDED.value;`;
  });

  sqlBlock += sqlInserts.join('\n');
  sqlBlock += `\n${markerEnd}\n`;

  fs.writeFileSync(seedFilePath, seedContent.trim() + sqlBlock, 'utf8');
  console.log('Translations successfully appended to seed_data.sql!');
}

main().catch(err => {
  console.error('Fatal sync error:', err);
});
