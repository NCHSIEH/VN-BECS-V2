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

  const elementDetails = await page.evaluate(() => {
    const el = document.querySelector('.flex.flex-col.items-end.gap-6.w-full.md\\:w-auto');
    if (!el) return 'Element not found';

    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);

    return {
      tagName: el.tagName,
      className: el.className,
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right
      },
      style: {
        position: style.position,
        zIndex: style.zIndex,
        display: style.display,
        pointerEvents: style.pointerEvents,
        width: style.width,
        height: style.height,
        opacity: style.opacity,
        top: style.top,
        left: style.left
      },
      parent: el.parentElement ? {
        tagName: el.parentElement.tagName,
        className: el.parentElement.className,
        rect: el.parentElement.getBoundingClientRect()
      } : null
    };
  });

  console.log('MEASUREMENT DETAILS:', JSON.stringify(elementDetails, null, 2));

  await browser.close();
}

run().catch(console.error);
