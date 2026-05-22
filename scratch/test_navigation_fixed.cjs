const { chromium } = require('@playwright/test');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to http://localhost:54321 ...');
  await page.goto('http://localhost:54321');

  await page.waitForSelector('input[placeholder="e.g. admin"]');
  await page.fill('input[placeholder="e.g. admin"]', 'admin');
  await page.fill('input[placeholder="••••••••"]', 'admin123');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'scratch/pre_click.png' });
  console.log('Pre-click screenshot saved.');

  // Find all buttons with class clinical-card
  const buttonsCount = await page.evaluate(() => {
    return document.querySelectorAll('button.clinical-card').length;
  });
  console.log(`Found ${buttonsCount} clinical-card buttons.`);

  if (buttonsCount > 0) {
    console.log('Clicking the first clinical-card button...');
    await page.click('button.clinical-card:first-of-type');
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'scratch/post_click.png' });
    console.log('Post-click screenshot saved.');

    // Check if we transitioned to LIMS view by looking at body text or elements
    const pageContent = await page.evaluate(() => {
      return {
        bodyText: document.body.innerText.substring(0, 300),
        limsHeaderExists: !!document.querySelector('.h-12.bg-rose-600') || document.body.innerText.includes('DONOR CENTER') || document.body.innerText.includes('HIẾN MÁU')
      };
    });
    console.log('Post-click Page Content:', pageContent);
  } else {
    console.log('No clinical-card buttons found to click.');
  }

  await browser.close();
}

run().catch(console.error);
