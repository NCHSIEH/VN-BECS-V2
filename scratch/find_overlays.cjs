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

  const coordinates = [
    { x: 100, y: 100, name: 'Top-Left' },
    { x: 640, y: 200, name: 'Top-Center' },
    { x: 640, y: 360, name: 'Center' },
    { x: 100, y: 600, name: 'Bottom-Left' },
    { x: 1100, y: 600, name: 'Bottom-Right' }
  ];

  const results = await page.evaluate((coords) => {
    return coords.map(c => {
      const el = document.elementFromPoint(c.x, c.y);
      if (!el) return { name: c.name, x: c.x, y: c.y, found: false };

      // Traversal to see parents
      const path = [];
      let current = el;
      while (current) {
        path.push({
          tagName: current.tagName,
          id: current.id,
          className: current.className,
          rect: current.getBoundingClientRect()
        });
        current = current.parentElement;
      }

      return {
        name: c.name,
        x: c.x,
        y: c.y,
        found: true,
        tagName: el.tagName,
        id: el.id,
        className: el.className,
        rect: el.getBoundingClientRect(),
        path: path.slice(0, 4) // Show up to 4 ancestors
      };
    });
  }, coordinates);

  console.log('COORDINATES ANALYSIS:');
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
}

run().catch(console.error);
