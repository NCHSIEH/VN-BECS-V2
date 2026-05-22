const { chromium } = require('@playwright/test');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Log console messages
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error(`[BROWSER ERROR] ${err.message}`);
  });

  console.log('Navigating to http://localhost:54321 ...');
  await page.goto('http://localhost:54321');

  // Wait for login form to be visible
  await page.waitForSelector('input[placeholder="e.g. admin"]');
  console.log('Form loaded, typing credentials...');

  await page.fill('input[placeholder="e.g. admin"]', 'admin');
  await page.fill('input[placeholder="••••••••"]', 'admin123');

  console.log('Clicking login...');
  await page.click('button[type="submit"]');

  console.log('Waiting for navigation/portal...');
  // Wait a few seconds for portal to render
  await page.waitForTimeout(4000);

  // Take a screenshot of the portal
  await page.screenshot({ path: 'scratch/portal_debug.png' });
  console.log('Screenshot saved to scratch/portal_debug.png');

  // Let's check what element is at the center of the page
  const overlayInfo = await page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    if (!el) return 'No element found at center';
    return {
      tagName: el.tagName,
      id: el.id,
      className: el.className,
      textContent: el.textContent ? el.textContent.substring(0, 100) : '',
      outerHTML: el.outerHTML ? el.outerHTML.substring(0, 300) : ''
    };
  });
  console.log('Element at center of page:', overlayInfo);

  // Let's also check if there are any overlays with z-index >= 100
  const overlays = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*'))
      .map(el => {
        const style = window.getComputedStyle(el);
        const zIndex = parseInt(style.zIndex, 10);
        const display = style.display;
        const visibility = style.visibility;
        const opacity = parseFloat(style.opacity);
        if (zIndex >= 50 && display !== 'none' && visibility !== 'hidden' && opacity > 0) {
          return {
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            zIndex,
            rect: el.getBoundingClientRect()
          };
        }
        return null;
      })
      .filter(Boolean);
  });
  console.log('Active high z-index elements:', overlays);

  await browser.close();
}

run().catch(console.error);
