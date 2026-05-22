/**
 * Test login page with EVERY theme to find if any theme makes the page look disabled
 */
const { chromium } = require('playwright');
const path = require('path');

const THEMES = [
  'classic-medical-blue',
  'classic-editorial',
  'warm-minimalist',
  'nordic-crisp',
  'oceanic-healing',
  'tech-lavender',
  'minty-aqua',
  'slate-corporate',
  'frosted-glacier',
  'aurora-glow'
];

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const theme of THEMES) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.setViewportSize({ width: 1400, height: 900 });
    
    // Pre-set the theme in localStorage
    await page.addInitScript((t) => {
      localStorage.setItem('vnbbms_theme', t);
    }, theme);

    await page.goto('http://localhost:54321', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    
    // Apply theme via attribute
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await page.waitForTimeout(500);

    await page.screenshot({ path: path.join(__dirname, `login_${theme}.png`) });

    // Check if inputs are visually accessible
    const info = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      const results = [];
      inputs.forEach(inp => {
        const cs = getComputedStyle(inp);
        results.push({
          type: inp.type,
          bgColor: cs.backgroundColor,
          color: cs.color,
          borderColor: cs.borderColor,
          opacity: cs.opacity,
          pointerEvents: cs.pointerEvents,
          cursor: cs.cursor,
        });
      });

      // Check if any element covers the form
      const formCard = document.querySelector('.clinical-card');
      if (formCard) {
        const cardRect = formCard.getBoundingClientRect();
        const cx = cardRect.x + cardRect.width / 2;
        const cy = cardRect.y + cardRect.height / 2;
        const hitEl = document.elementFromPoint(cx, cy);
        results.push({
          type: 'hit-test',
          hitTag: hitEl?.tagName,
          hitClasses: (hitEl?.className || '').toString().substring(0, 60),
          isInsideCard: formCard.contains(hitEl),
        });
      }

      return results;
    });

    const inputInfo = info.filter(i => i.type !== 'hit-test');
    const hitTest = info.find(i => i.type === 'hit-test');
    
    const allOk = inputInfo.every(i => i.pointerEvents === 'auto' && parseFloat(i.opacity) >= 0.9);
    const hitOk = hitTest?.isInsideCard;
    
    console.log(`${allOk && hitOk ? '✅' : '❌'} ${theme}: inputs=${allOk ? 'OK' : 'BLOCKED'} hit=${hitOk ? 'OK' : 'BLOCKED'} bg=${inputInfo[0]?.bgColor} opacity=${inputInfo[0]?.opacity}`);
    
    if (!allOk || !hitOk) {
      console.log('   Details:', JSON.stringify(info, null, 2));
    }

    await ctx.close();
  }

  await browser.close();
  console.log('\nDone!');
})();
