const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'src', 'server', 'db.ts');
let content = fs.readFileSync(dbPath, 'utf8');

// 1. Export isTableMissingError
content = content.replace('function isTableMissingError(error: any): boolean {', 'export function isTableMissingError(error: any): boolean {');

// 2. Add imports at top
const imports = `import { orders } from './repositories/orderRepo';\nimport { inventory } from './repositories/inventoryRepo';\nimport { patients } from './repositories/patientRepo';\n`;
content = content.replace(`import { hashPassword } from './crypto';`, `import { hashPassword } from './crypto';\n${imports}`);

// 3. Remove orders object and replace with export
content = content.replace(/export const orders = \{[\s\S]*?\n\};\n/, '');

// 4. Remove inventory object
content = content.replace(/export const inventory = \{[\s\S]*?\n\};\n/, '');

// 5. Remove patients object
content = content.replace(/export const patients = \{[\s\S]*?\n\};\n/, '');

// 6. Add exports
content += `\nexport { orders, inventory, patients };\n`;

fs.writeFileSync(dbPath, content, 'utf8');
console.log('Successfully refactored db.ts');
