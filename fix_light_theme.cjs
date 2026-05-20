const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const replacements = [
  { from: /divide-slate-800/g, to: 'divide-slate-100' },
  { from: /divide-gray-800/g, to: 'divide-gray-100' },
  { from: /bg-white\/20/g, to: 'bg-white' },
  { from: /hover:bg-white\/50/g, to: 'hover:bg-slate-50' },
  { from: /bg-emerald-900\/50/g, to: 'bg-emerald-50' },
  { from: /border-emerald-800/g, to: 'border-emerald-200' },
  { from: /text-emerald-400/g, to: 'text-emerald-600' },
  { from: /text-blue-400/g, to: 'text-blue-600' },
  { from: /text-orange-400/g, to: 'text-orange-600' },
  { from: /text-rose-400/g, to: 'text-rose-600' },
  { from: /text-purple-400/g, to: 'text-purple-600' },
  { from: /bg-indigo-950\/30/g, to: 'bg-indigo-50' },
  { from: /border-indigo-900\/50/g, to: 'border-indigo-200' },
  { from: /text-indigo-400/g, to: 'text-indigo-600' },
  { from: /hover:text-indigo-300/g, to: 'hover:text-indigo-700' },
  { from: /hover:bg-indigo-900\/50/g, to: 'hover:bg-indigo-100' },
  { from: /bg-blue-950\/30/g, to: 'bg-blue-50' },
  { from: /border-blue-900\/50/g, to: 'border-blue-200' },
  { from: /text-blue-400/g, to: 'text-blue-600' },
  { from: /hover:text-blue-300/g, to: 'hover:text-blue-700' },
  { from: /hover:bg-blue-900\/50/g, to: 'hover:bg-blue-100' },
  { from: /bg-slate-950/g, to: 'bg-slate-50' },
  { from: /text-slate-200/g, to: 'text-slate-800' }
];

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  replacements.forEach(({from, to}) => {
    content = content.replace(from, to);
  });
  if (original !== content) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + file);
  }
});
