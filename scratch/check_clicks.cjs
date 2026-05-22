const { chromium } = require('@playwright/test');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleMsgs = [];
  const pageErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleMsgs.push(`[${msg.type().toUpperCase()}] ${text}`);
  });

  page.on('pageerror', err => {
    pageErrors.push(err.message + '\n' + err.stack);
  });

  console.log('Navigating to http://localhost:54321 ...');
  await page.goto('http://localhost:54321');

  await page.waitForSelector('input[placeholder="e.g. admin"]');
  await page.fill('input[placeholder="e.g. admin"]', 'admin');
  await page.fill('input[placeholder="••••••••"]', 'admin123');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(4000);

  console.log('--- Initial Page State ---');
  console.log('Errors:', pageErrors);
  console.log('Logs:', consoleMsgs);

  // Find the button for "捐血中心站 (DONOR CENTER)"
  const stationButtons = await page.$$('button');
  console.log(`Found ${stationButtons.length} buttons on the page.`);

  const buttonsInfo = [];
  for (let i = 0; i < stationButtons.length; i++) {
    const text = await stationButtons[i].innerText();
    const isVisible = await stationButtons[i].isVisible();
    const className = await stationButtons[i].getAttribute('class');
    buttonsInfo.push({ index: i, text: text.replace(/\n/g, ' '), isVisible, className });
  }
  console.log('Buttons on page:', buttonsInfo);

  // Try to click the first station card button (index 3 or similar)
  const donorCenterButton = stationButtons.find(async (btn) => {
    const text = await btn.innerText();
    return text.includes('捐血中心站');
  });

  if (donorCenterButton) {
    console.log('Found Donor Center button! Attempting click...');
    try {
      await donorCenterButton.click({ timeout: 2000 });
      console.log('Click completed successfully!');
    } catch (clickErr) {
      console.error('Click failed:', clickErr.message);
    }
  } else {
    // Try to find the button by exact text or class selector
    console.log('Could not find Donor Center button directly. Trying selector...');
    try {
      await page.click('text="捐血中心站 (DONOR CENTER)"', { timeout: 2000 });
      console.log('Click on selector completed!');
    } catch (clickErr) {
      console.error('Click on selector failed:', clickErr.message);
    }
  }

  await page.waitForTimeout(2000);
  console.log('--- Post-Click State ---');
  console.log('Errors:', pageErrors);
  console.log('New logs:', consoleMsgs.slice(-10));

  await browser.close();
}

run().catch(console.error);
