import * as db from './src/server/db.ts';

const MOCK_PATIENTS = [
  { id: 'MRN-HCM-887766', name: 'Nguyễn Văn A', bloodType: 'O Positive', hasAntibody: true, antibodyType: 'Anti-E', specimenExpired: true, specimenHours: 73 },
  { id: 'MRN-HN-112233', name: 'Trần Thị B', bloodType: 'A Negative', hasAntibody: false, specimenExpired: false, specimenHours: 12 },
  { id: 'MRN-DN-445566', name: 'Lê Văn C', bloodType: 'B Positive', hasAntibody: true, antibodyType: 'Anti-Kell', specimenExpired: false, specimenHours: 24 },
  { id: 'MRN-CT-998877', name: 'Phạm Thị D', bloodType: 'AB Positive', hasAntibody: false, specimenExpired: true, specimenHours: 96 },
];

async function run() {
  console.log("Seeding patients...");
  for (const p of MOCK_PATIENTS) {
    try {
      await db.patients.create({
        id: p.id,
        name: p.name,
        bloodType: p.bloodType,
        hasAntibody: p.hasAntibody,
        antibodyType: p.antibodyType,
        specimenExpired: p.specimenExpired,
        specimenHours: p.specimenHours
      });
      console.log(`Created ${p.name}`);
    } catch (e: any) {
      if (e.message.includes('duplicate key value')) {
         console.log(`Skipped ${p.name} (Already exists)`);
      } else {
         console.error(`Error creating ${p.name}:`, e.message);
      }
    }
  }
  console.log("Done seeding.");
}

run();
