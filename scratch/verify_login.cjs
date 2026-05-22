/**
 * Verify LOGIN PAGE interactivity (before login)
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(`PAGE_ERROR: ${err.message}`));

  try {
    console.log('1. Loading page...');
    await page.goto('http://localhost:54321', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(__dirname, 'login_page.png') });

    // Check ALL elements at the login form area
    console.log('\n2. Element inspection at login form coordinates:');
    const formArea = await page.evaluate(() => {
      // Find input fields
      const inputs = document.querySelectorAll('input');
      const buttons = document.querySelectorAll('button[type="submit"]');
      const results = [];

      inputs.forEach((inp, i) => {
        const rect = inp.getBoundingClientRect();
        const cs = getComputedStyle(inp);
        results.push({
          type: `input[${i}]`,
          inputType: inp.type,
          disabled: inp.disabled,
          readOnly: inp.readOnly,
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
          pointerEvents: cs.pointerEvents,
          opacity: cs.opacity,
          cursor: cs.cursor,
          visibility: cs.visibility,
          display: cs.display,
        });
      });

      buttons.forEach((btn, i) => {
        const rect = btn.getBoundingClientRect();
        const cs = getComputedStyle(btn);
        results.push({
          type: `submit[${i}]`,
          disabled: btn.disabled,
          text: btn.textContent?.trim().substring(0, 30),
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
          pointerEvents: cs.pointerEvents,
          opacity: cs.opacity,
          cursor: cs.cursor,
        });
      });

      return results;
    });

    formArea.forEach(el => console.log('  ', JSON.stringify(el)));

    // Check for any blocking overlays or fixed elements above the form
    console.log('\n3. Fixed/absolute positioned overlays:');
    const overlays = await page.evaluate(() => {
      const all = document.querySelectorAll('*');
      const blocking = [];
      all.forEach(el => {
        const cs = getComputedStyle(el);
        if ((cs.position === 'fixed' || cs.position === 'absolute') && 
            cs.display !== 'none' && cs.visibility !== 'hidden' &&
            cs.pointerEvents !== 'none') {
          const rect = el.getBoundingClientRect();
          if (rect.width > 300 && rect.height > 300 && parseFloat(cs.zIndex) >= 1) {
            blocking.push({
              tag: el.tagName,
              id: el.id,
              classes: (el.className || '').toString().substring(0, 100),
              rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
              zIndex: cs.zIndex,
              pointerEvents: cs.pointerEvents,
              opacity: cs.opacity,
              bgColor: cs.backgroundColor,
            });
          }
        }
      });
      return blocking;
    });

    if (overlays.length === 0) {
      console.log('   ✅ No blocking overlays found!');
    } else {
      overlays.forEach((o, i) => console.log(`   ❌ [${i}]`, JSON.stringify(o)));
    }

    // Check for elements AT the center of the input fields
    console.log('\n4. Element-from-point at form controls:');
    const inputRects = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      return Array.from(inputs).map(inp => {
        const r = inp.getBoundingClientRect();
        return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), type: inp.type };
      });
    });

    for (const ir of inputRects) {
      const hitEl = await page.evaluate(({x, y}) => {
        const el = document.elementFromPoint(x, y);
        if (!el) return { tag: 'null' };
        return {
          tag: el.tagName,
          type: el.getAttribute('type'),
          classes: (el.className || '').toString().substring(0, 80),
          id: el.id,
        };
      }, ir);
      const isCorrect = hitEl.tag === 'INPUT' && hitEl.type === ir.type;
      console.log(`   ${isCorrect ? '✅' : '❌'} Input[${ir.type}] at (${ir.x},${ir.y}): hit ${hitEl.tag}[type=${hitEl.type}] classes="${hitEl.classes}"`);
    }

    // Actually try to type and click
    console.log('\n5. Attempting to fill and submit...');
    try {
      await page.fill('input[type="text"]', 'admin', { timeout: 5000 });
      console.log('   ✅ Filled username');
    } catch (e) {
      console.log('   ❌ Failed to fill username:', e.message);
    }

    try {
      await page.fill('input[type="password"]', 'admin123', { timeout: 5000 });
      console.log('   ✅ Filled password');
    } catch (e) {
      console.log('   ❌ Failed to fill password:', e.message);
    }

    try {
      await page.click('button[type="submit"]', { timeout: 5000 });
      console.log('   ✅ Clicked submit');
    } catch (e) {
      console.log('   ❌ Failed to click submit:', e.message);
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(__dirname, 'after_login_attempt.png') });

    // Check current state
    const pageState = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return { h1: h1?.textContent?.substring(0, 50), url: window.location.href };
    });
    console.log('   Page state:', JSON.stringify(pageState));

    console.log('\n6. JS Errors:');
    if (errors.length === 0) console.log('   ✅ No errors');
    else errors.forEach(e => console.log('   ❌', e));

  } catch (err) {
    console.error('Fatal:', err.message);
  }

  await browser.close();
  console.log('\nDone!');
})();
