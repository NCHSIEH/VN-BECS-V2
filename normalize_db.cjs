const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'src', 'server', 'db.ts');
let content = fs.readFileSync(dbPath, 'utf8');

// Update orders in fallbackStores
content = content.replace(
  /items: '\[\{"productCode":"P-RBC-01","quantity":1\}\]'/,
  `items: []` // We will remove string items
);
content = content.replace(
  /allocatedUnits: '\["CMP-HCM-01-RBC"\]'/,
  `allocatedUnits: []`
);

// We should actually just replace the stringified fields in the objects.
// Wait, since it's just a PoC array, I can do string replacements for the specific JSON strings.
content = content.replace(
  `items: '[{"productCode":"P-RBC-01","quantity":1}]'`,
  `` // remove completely
);
content = content.replace(
  `allocatedUnits: '["CMP-HCM-01-RBC"]'`,
  ``
);

// Actually, let's just insert order_items and patient_antibodies at the end of fallbackStores
content = content.replace(
  /rare_donors: \[\s*\{.*?\}\s*\] as any\[\]\n\};/,
  `rare_donors: [\n    { id: 'RD-01', name: '阮小龍 (Nguyen Tieu Long)', nationalId: '001099008877', bloodType: 'O', rhd: 'Negative', phenotype: 'Bombay O (h/h)', hlaTyping: '{"A":"02, 24","B":"46, 54"}', hpaTyping: '{"1":"a,a"}', location: 'Hanoi', contact: '+84901234567', status: 'Available', lastDonationDate: '2026-02-15', orgId: 'BC-HN-01' }\n  ] as any[],\n  order_items: [\n    { orderId: 'ORD-HCM-901', productCode: 'P-RBC-01', quantity: 1, allocatedUnits: 'CMP-HCM-01-RBC' }\n  ] as any[],\n  patient_antibodies: [\n    { patientId: 'MRN-HCM-887766', antibody: 'Anti-E' },\n    { patientId: 'MRN-DN-445566', antibody: 'Anti-Kell' }\n  ] as any[]\n};`
);

fs.writeFileSync(dbPath, content, 'utf8');
console.log('Successfully added order_items and patient_antibodies to db.ts');
