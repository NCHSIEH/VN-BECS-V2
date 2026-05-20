const fs = require('fs');
const content = fs.readFileSync('c:/Users/nchsi/Documents/GitHub/vietnambloodmanagement-sop-10-v2.0/src/lib/i18n.tsx', 'utf8');

function checkLang(lang) {
    const start = content.indexOf(lang + ': {');
    if (start === -1) return;
    let braceCount = 1;
    let i = start + lang.length + 3;
    let end = i;
    while (braceCount > 0 && i < content.length) {
        if (content[i] === '{') braceCount++;
        if (content[i] === '}') braceCount--;
        i++;
    }
    end = i - 1;
    const dictText = content.substring(start + lang.length + 3, end);
    const keys = dictText.match(/^\s+([a-z0-9_]+):/gm).map(k => k.trim().replace(':', ''));
    const counts = {};
    keys.forEach(k => counts[k] = (counts[k] || 0) + 1);
    const duplicates = Object.keys(counts).filter(k => counts[k] > 1);
    console.log(`Duplicate keys in ${lang}:`, duplicates);
}

checkLang('en');
checkLang("'zh-TW'");
checkLang('vi');
