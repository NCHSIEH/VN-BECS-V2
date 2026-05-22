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

  // Check if button is enabled
  const isEnabled = await page.evaluate(() => {
    // Find button containing 捐血中心站
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('捐血中心站'));
    if (!btn) return 'Button not found';
    return {
      tagName: btn.tagName,
      className: btn.className,
      disabled: btn.disabled,
      opacity: window.getComputedStyle(btn).opacity,
      pointerEvents: window.getComputedStyle(btn).pointerEvents
    };
  });
  console.log('Donor Center Button properties:', isEnabled);

  console.log('Attempting click on Donor Center...');
  // Click using exact text
  await page.click('text="捐血中心站 (DONOR CENTER)"');
  
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'scratch/post_click.png' });
  console.log('Post-click screenshot saved.');

  // Check if we transitioned to LIMS
  const pageContent = await page.evaluate(() => {
    return {
      bodyText: document.body.innerText.substring(0, 500),
      hasLimsView: !!document.querySelector('.lims-view') || document.body.innerText.includes('LIMS')
    };
  });
  console.log('Post-click Page Content:', pageContent);

  await browser.close();
}

run().catch(console.error);
