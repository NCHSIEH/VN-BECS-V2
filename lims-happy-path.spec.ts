import { test, expect } from '@playwright/test';

/**
 * LIMS Blood Donation Center - Happy Path Demo Script
 * ====================================================
 * Simulates a complete, error-free blood donation workflow:
 *   Stage 1: Donor Registry  → Register a perfectly healthy donor
 *   Stage 2: Lab Diagnostics → Run IDM tests (result: CLEARED)
 *   Stage 3: Component Mfg  → Fabricate blood components from cleared unit
 *   Stage 4: Hub Release     → Release blood bag to national inventory
 *
 * Video: High-resolution 1920x1080, slowMo, cinematic blur-in intro
 */

test.use({
  viewport: { width: 1920, height: 1080 },
  video: {
    mode: 'on',
    size: { width: 1920, height: 1080 },
  },
});

// ─── Helper: pause with label ────────────────────────────────────────────────
async function pause(page: any, ms: number, label?: string) {
  if (label) console.log(`  ⏳ ${label}`);
  await page.waitForTimeout(ms);
}

// ─── Demo Donor ───────────────────────────────────────────────────────────────
const DEMO = {
  name:        'NGUYEN VAN DEMO',
  nationalId:  '001092' + String(Math.floor(Math.random() * 900000) + 100000),
  dob:         '1990/01/05',
  weight:      '68',
};

test('LIMS Happy Path - Complete Blood Donation Workflow', async ({ page }) => {
  // Allow up to 5 minutes for this full slow-motion demo recording
  test.setTimeout(300_000);

  // ─────────────────────────────────────────────────────────────────────────
  // INTRO: Cinematic blur-in effect
  // ─────────────────────────────────────────────────────────────────────────
  await page.goto('http://localhost:54321');

  await page.addStyleTag({
    content: `
      @keyframes blurIn {
        0%   { filter: blur(40px) saturate(0.2) brightness(0.4); transform: scale(1.10); }
        50%  { filter: blur(12px) saturate(0.7) brightness(0.75); transform: scale(1.03); }
        100% { filter: blur(0px)  saturate(1)   brightness(1);   transform: scale(1); }
      }
      body { animation: blurIn 3.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
    `
  });

  await pause(page, 3500, 'Cinematic intro...');

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Login
  // ─────────────────────────────────────────────────────────────────────────
  console.log('🔐 Step 1: Authentication');
  await page.fill('input[type="text"]',     'admin');
  await pause(page, 900);
  await page.fill('input[type="password"]', 'admin123');
  await pause(page, 900);
  await page.locator('button[type="submit"]').click();
  await pause(page, 2500, 'Portal loading...');

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: Enter LIMS — first motion.button card in the portal grid
  // ─────────────────────────────────────────────────────────────────────────
  console.log('🏥 Step 2: Entering LIMS Donor Center');

  // The portal grid renders station cards as motion.button elements.
  // LIMS is always the first card (index 0).
  const allStationCards = page.locator('main button.clinical-card, main [class*="clinical-card"]');
  
  // Fallback: just grab any button that contains the "High Volume" status badge text
  // (LIMS card has status: 'High Volume')
  let limsCard = page.locator('button').filter({ has: page.locator('text=HIGH VOLUME') }).first();
  
  // Wait up to 12s for the portal to load
  await limsCard.waitFor({ state: 'visible', timeout: 12000 });
  await pause(page, 1500, 'Portal loaded — LIMS card found');
  await limsCard.click();
  await pause(page, 3000, 'LIMS system initializing...');

  // ─────────────────────────────────────────────────────────────────────────
  // STAGE 1: DONOR REGISTRY
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n📋 STAGE 1: Donor Registry');

  // Ensure DONOR tab is active (click it in the sidebar)
  // Sidebar buttons contain svg icons — the DONOR stage button has a Users icon
  // The label text changes by i18n; find by the Users SVG icon
  const donorTabBtn = page.locator('aside button').filter({
    has: page.locator('svg.lucide-users')
  }).first();
  
  if (await donorTabBtn.isVisible()) {
    await donorTabBtn.click();
    await pause(page, 1500, 'DONOR tab activated');
  }

  // Click "Register Donor" button (has a Plus icon)
  const registerBtn = page.locator('button').filter({
    has: page.locator('svg.lucide-plus')
  }).first();
  await registerBtn.waitFor({ state: 'visible', timeout: 8000 });
  await pause(page, 1000);
  await registerBtn.click();
  await pause(page, 2000, 'Donor enrollment modal opened');

  // Fill in Donor Name
  const nameInput = page.locator('input[placeholder*="NGUYEN VAN"]').first();
  await nameInput.waitFor({ state: 'visible', timeout: 5000 });
  await nameInput.fill(DEMO.name);
  await pause(page, 1500, `Name: ${DEMO.name}`);

  // Fill in CCCD (National ID)
  const cccdInput = page.locator('input[placeholder="001092000001"]').first();
  await cccdInput.fill(DEMO.nationalId);
  await pause(page, 2000, 'CCCD validated ✓');

  // Fill in Date of Birth
  const dobInput = page.locator('input[placeholder="YYYY/MM/DD"]').first();
  await dobInput.fill(DEMO.dob);
  await pause(page, 1800, 'Age validated ✓');

  // Fill in Weight
  const weightInput = page.locator('input[placeholder="KG"]').first();
  await weightInput.fill(DEMO.weight);
  await pause(page, 1200, 'Weight: 68 KG');

  // Blood Type: O+ is default — show it to audience
  await pause(page, 2500, 'Blood type O Positive (default) — no change needed');

  // Health Questionnaire: all boxes unchecked = perfectly healthy donor
  await pause(page, 2000, 'Health questionnaire: ALL CLEAR — zero deferral flags');

  // Submit the registration form
  const submitDonorBtn = page.locator('button').filter({ hasText: /Initialize Record/i }).first();
  await submitDonorBtn.click();
  await pause(page, 3000, 'Submitting registration to server...');

  // Wait for success: modal closes (isDonorModalOpen becomes false)
  const donorModal = page.locator('text=DONOR ENROLLMENT').first();
  await donorModal.waitFor({ state: 'hidden', timeout: 15000 });
  await pause(page, 2500, '✅ Donor registered! Record saved to real database.');

  // ─────────────────────────────────────────────────────────────────────────
  // PHLEBOTOMY: Blood Collection
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n🩸 Phlebotomy: Blood Collection');

  // Dismiss toast by clicking "稍後" (Later) so we can interact with the table
  const laterBtn = page.locator('.fixed.bottom-8 button').filter({ hasText: /稍後|Later/i }).first();
  if (await laterBtn.isVisible()) await laterBtn.click();
  await pause(page, 1500);

  // Find the newly registered donor row and click Collect (use .first() to avoid strict mode errors with multiple demo donors)
  const donorRow = page.locator('tbody tr').filter({ hasText: 'NGUYEN VAN DEMO' }).first();
  await donorRow.waitFor({ state: 'visible', timeout: 8000 });
  await pause(page, 2000, 'Donor found in Registry — initiating phlebotomy');

  // The Collect button has text that starts with 'Collect' (non-deferred donors)
  const collectBtn = donorRow.locator('button').filter({ hasText: /Collect|L\u1EA5y m\u00E1u/i }).first();
  await collectBtn.click();
  await pause(page, 2000, 'Phlebotomy modal opened');

  // Auto-generate ISBT DIN barcode
  const dinRefreshBtn = page.locator('button').filter({
    has: page.locator('svg.lucide-refresh-ccw')
  }).first();
  if (await dinRefreshBtn.isVisible()) {
    await dinRefreshBtn.click();
    await pause(page, 1200, 'ISBT Donation ID auto-generated');
  }

  // Start the blood collection run
  const startRunBtn = page.locator('button').filter({ hasText: /Start Run|Confirm|B\u1EAFt \u0111\u1EA7u/i }).first();
  await startRunBtn.click();
  await pause(page, 3000, '🩸 Blood collection initiated (450ml Whole Blood)');

  // Wait for collection modal to close
  const collectModal = page.locator('text=ISBT PROTOCOL').first();
  await collectModal.waitFor({ state: 'hidden', timeout: 10000 });
  await pause(page, 2000, 'Collection recorded successfully');

  // ─────────────────────────────────────────────────────────────────────────
  // STAGE 2: CLINICAL DIAGNOSTICS (LAB)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n🧪 STAGE 2: Clinical Diagnostics');

  // Navigate via toast CTA or sidebar
  const labToastCta = page.locator('.fixed.bottom-8 button').filter({
    hasText: /前往|→|LAB|篩檢|Diagnostics/i
  }).first();

  if (await labToastCta.isVisible()) {
    await pause(page, 1000);
    await labToastCta.click();
  } else {
    // Fallback: click LAB tab in sidebar (Thermometer icon)
    const labTab = page.locator('aside button').filter({
      has: page.locator('svg.lucide-thermometer')
    }).first();
    await labTab.click();
  }
  await pause(page, 3000, 'Clinical Diagnostics tab loaded');

  // Click "Process Diagnostics" for the PENDING unit
  const processDiagBtn = page.locator('button').filter({
    hasText: /Process Diagnostics/i
  }).first();
  await processDiagBtn.waitFor({ state: 'visible', timeout: 10000 });
  await pause(page, 2500, 'PENDING unit queued — running IDM serology panel...');
  await processDiagBtn.click();
  await pause(page, 4000, 'IDM panel processing: HBsAg, Anti-HCV, Anti-HIV, VDRL...');

  // Confirm CLEARED badge appears
  const clearedBadge = page.locator('text=CLEARED').first();
  await clearedBadge.waitFor({ state: 'visible', timeout: 10000 });
  await pause(page, 3500, '✅ IDM Result: CLEARED — unit is biologically SAFE');

  // Navigate to PROCESS
  const processCta = page.locator('.fixed.bottom-8 button').filter({
    hasText: /前往|→|採血|PROCESS|Fabricate/i
  }).first();
  if (await processCta.isVisible()) {
    await pause(page, 1000);
    await processCta.click();
  } else {
    const processTab = page.locator('aside button').filter({
      has: page.locator('svg.lucide-droplet')
    }).first();
    await processTab.click();
  }
  await pause(page, 3000, 'Moving to Component Manufacturing...');

  // ─────────────────────────────────────────────────────────────────────────
  // STAGE 3: COMPONENT MANUFACTURING (PROCESS)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n⚗️  STAGE 3: Component Manufacturing');

  const fabricateBtn = page.locator('button').filter({
    hasText: /Fabricate Components/i
  }).first();
  await fabricateBtn.waitFor({ state: 'visible', timeout: 10000 });
  await pause(page, 2500, 'CLEARED unit loaded — initiating centrifugation protocol...');
  await fabricateBtn.click();
  await pause(page, 4000, '⚗️ Centrifuge complete — RBC / FFP / PLT separated and labelled');

  // Navigate to RELEASE
  const releaseCta = page.locator('.fixed.bottom-8 button').filter({
    hasText: /前往|→|物流|RELEASE|HUB/i
  }).first();
  if (await releaseCta.isVisible()) {
    await pause(page, 1000);
    await releaseCta.click();
  } else {
    const releaseTab = page.locator('aside button').filter({
      has: page.locator('svg.lucide-send')
    }).first();
    await releaseTab.click();
  }
  await pause(page, 3000, 'Moving to Chain of Custody...');

  // ─────────────────────────────────────────────────────────────────────────
  // STAGE 4: PRODUCT RELEASE TO HUB
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n🚀 STAGE 4: Release to National Hub');

  const releaseHubBtn = page.locator('button').filter({
    hasText: /RELEASE TO HUB/i
  }).first();
  await releaseHubBtn.waitFor({ state: 'visible', timeout: 10000 });
  await pause(page, 3000, 'Blood component READY for national dispatch...');
  await releaseHubBtn.click();
  await pause(page, 4000, '🚀 Transmitting to VN-BECS National Command Center...');

  // Confirm HUB INTRANSIT status — wait longer since API call may take time
  const hubStatus = page.locator('text=HUB INTRANSIT').first();
  await hubStatus.waitFor({ state: 'visible', timeout: 20000 });
  await pause(page, 5000, '✅ MISSION COMPLETE — Blood product entered national logistics chain!');

  // ─────────────────────────────────────────────────────────────────────────
  // OUTRO: Final wide-shot
  // ─────────────────────────────────────────────────────────────────────────
  await pause(page, 5000, '🎬 Recording outro...');
  console.log('\n🎬 LIMS Happy Path Demo — Recording Complete!');
});
