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

  // Inspect DOM elements that have absolute or fixed positioning or cover the screen
  const elements = await page.evaluate(() => {
    const list = [];
    const all = document.querySelectorAll('*');
    for (const el of all) {
      const style = window.getComputedStyle(el);
      const position = style.position;
      const zIndex = style.zIndex;
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      const opacity = style.opacity;
      const pointerEvents = style.pointerEvents;
      
      // If it has fixed or absolute position and is large, or has a high z-index
      if ((position === 'fixed' || position === 'absolute') && width > 100 && height > 100) {
        list.push({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          position,
          zIndex,
          width,
          height,
          opacity,
          pointerEvents,
          innerText: el.innerText ? el.innerText.substring(0, 100) : ''
        });
      }
    }
    return list;
  });

  console.log('--- Fixed / Absolute large elements ---');
  console.log(JSON.stringify(elements, null, 2));

  // Let's check what element is returned at the center of the screen
  const centerElement = await page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    if (!el) return 'None';
    return {
      tagName: el.tagName,
      className: el.className,
      id: el.id,
      outerHTML: el.outerHTML.substring(0, 200)
    };
  });

  console.log('--- Element at center of screen ---');
  console.log(centerElement);

  await browser.close();
}

run().catch(console.error);
