import { test, expect } from '@playwright/test';

test.use({ 
  viewport: { width: 1280, height: 720 },
  video: 'on',
});

test('CDSS Dual Alert Block Simulation', async ({ page }) => {
  // Go to the local app (assuming it runs on port 54321 as per package.json)
  await page.goto('http://localhost:54321');

  // Login
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.locator('button[type="submit"]').click();

  // Wait for PortalView and select HOSPITAL system (it is the 4th station card)
  // We can find it by looking for the Stethoscope icon which is amber-500
  const hospitalBtn = page.locator('button:has(.text-amber-500.lucide-stethoscope)').first();
  await hospitalBtn.waitFor({ state: 'visible' });
  await hospitalBtn.click();

  // Now we are in Hospital mode. Click the MTP Tactical button on the Sidebar.
  // It has a Zap icon.
  const mtpSideBtn = page.locator('aside button:has(svg.lucide-zap)').first();
  await mtpSideBtn.waitFor({ state: 'visible' });
  await mtpSideBtn.click();

  // Click the "Activate MTP" button (it has a ShieldAlert icon inside a button)
  const activateBtn = page.locator('button').filter({ hasText: /Activate MTP|啟動/i }).first();
  // If the text matcher fails due to i18n, fallback to checking button classes
  const fallbackActivateBtn = page.locator('button.bg-rose-600.hover\\:bg-rose-700').first();
  if (await activateBtn.isVisible()) {
    await activateBtn.click();
  } else {
    await fallbackActivateBtn.click();
  }

  // The modal opens. It is pre-filled with MRN-HCM-887766 according to our code.
  // Wait for the modal to appear by waiting for the submit button
  const submitBtn = page.locator('button').filter({ hasText: /Initiate Protocol|送出/i }).first();
  const fallbackSubmitBtn = page.locator('.fixed.inset-0 button.bg-rose-600');
  if (await submitBtn.isVisible()) {
    await submitBtn.click();
  } else {
    await fallbackSubmitBtn.click();
  }

  // Wait for the CDSS Fatal Error Overlay to appear
  const fatalErrorTitle = page.locator('text=Fatal Error');
  await fatalErrorTitle.waitFor({ state: 'visible', timeout: 5000 });
  await expect(page.locator('text=Clinical Block: Irregular Antibody')).toBeVisible();

  // Wait a few seconds to let the video record the modal clearly
  await page.waitForTimeout(6000);

  // Click Acknowledge
  await page.getByRole('button', { name: /Acknowledge & Cancel Order/i }).click();
  
  // Wait a moment for closing animation
  await page.waitForTimeout(1000);
});
