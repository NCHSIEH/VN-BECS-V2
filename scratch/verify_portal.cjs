/**
 * Verify portal is interactive after login using Playwright
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  // Collect console messages
  const consoleMsgs = [];
  page.on('console', msg => consoleMsgs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleMsgs.push(`[PAGE_ERROR] ${err.message}`));

  try {
    console.log('1. Loading login page...');
    await page.goto('http://localhost:54321', { waitUntil: 'networkidle', timeout: 15000 });

    console.log('2. Logging in as admin...');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(__dirname, 'step2_portal.png') });

    console.log('3. Testing click interactivity...');

    // Check multiple points across the card grid area
    const points = [
      { x: 350, y: 500, label: 'Card row 1 left' },
      { x: 700, y: 500, label: 'Card row 1 center' },
      { x: 1050, y: 500, label: 'Card row 1 right' },
      { x: 350, y: 700, label: 'Card row 2 left' },
      { x: 700, y: 700, label: 'Card row 2 center' },
      { x: 700, y: 350, label: 'Header overlap zone' },
    ];

    for (const pt of points) {
      const info = await page.evaluate(({x, y}) => {
        const el = document.elementFromPoint(x, y);
        if (!el) return { tag: 'null', result: 'no element' };
        return {
          tag: el.tagName,
          text: (el.textContent || '').substring(0, 60).trim(),
          cursor: getComputedStyle(el).cursor,
          pointerEvents: getComputedStyle(el).pointerEvents,
          opacity: getComputedStyle(el).opacity,
          filter: getComputedStyle(el).filter,
        };
      }, pt);
      console.log(`   ${pt.label} (${pt.x}, ${pt.y}):`, JSON.stringify(info));
    }

    // Check if any fixed overlays exist blocking the page
    const overlays = await page.evaluate(() => {
      const all = document.querySelectorAll('*');
      const fixed = [];
      all.forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed' && cs.display !== 'none' && cs.visibility !== 'hidden') {
          const rect = el.getBoundingClientRect();
          if (rect.width > 200 && rect.height > 200) {
            fixed.push({
              tag: el.tagName,
              classes: (el.className || '').substring(0, 100),
              rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
              zIndex: cs.zIndex,
              pointerEvents: cs.pointerEvents,
              opacity: cs.opacity,
            });
          }
        }
      });
      return fixed;
    });
    console.log('\n4. Large fixed overlays on page:');
    if (overlays.length === 0) {
      console.log('   ✅ No blocking overlays found!');
    } else {
      overlays.forEach((o, i) => console.log(`   [${i}]`, JSON.stringify(o)));
    }

    // Check grayscale / disabled state of cards
    const cardStates = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      const grayCards = [];
      buttons.forEach(btn => {
        const cs = getComputedStyle(btn);
        const rect = btn.getBoundingClientRect();
        // Only check large buttons (station cards)
        if (rect.width > 200 && rect.height > 100) {
          grayCards.push({
            text: btn.textContent?.substring(0, 50).trim(),
            filter: cs.filter,
            opacity: cs.opacity,
            cursor: cs.cursor,
            classes: btn.className?.substring(0, 80),
            isGray: cs.filter.includes('grayscale') || parseFloat(cs.opacity) < 0.9 || cs.cursor === 'not-allowed',
          });
        }
      });
      return grayCards;
    });
    console.log('\n5. Station card states:');
    if (cardStates.length === 0) {
      console.log('   ⚠️ No station card buttons found in DOM!');
    } else {
      cardStates.forEach((c, i) => {
        const status = c.isGray ? '❌ GRAY/DISABLED' : '✅ ACTIVE';
        console.log(`   [${i}] ${status} | cursor=${c.cursor} | opacity=${c.opacity} | filter=${c.filter} | ${c.text?.substring(0,30)}`);
      });
    }

    // Try clicking first card
    console.log('\n6. Attempting to click first station card...');
    const firstCard = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const btn of btns) {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 200 && rect.height > 100) {
          return { x: Math.round(rect.x + rect.width/2), y: Math.round(rect.y + rect.height/2), text: btn.textContent?.substring(0,40) };
        }
      }
      return null;
    });

    if (firstCard) {
      console.log(`   Clicking at (${firstCard.x}, ${firstCard.y}): "${firstCard.text}"`);
      await page.mouse.click(firstCard.x, firstCard.y);
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(__dirname, 'step3_after_click.png') });
      
      // Check if we navigated to a sub-system
      const newTitle = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        return h1 ? h1.textContent : 'no h1';
      });
      console.log(`   After click, page h1: "${newTitle}"`);
    } else {
      console.log('   ⚠️ Could not find any station card to click!');
    }

    console.log('\n7. Console messages:');
    consoleMsgs.slice(0, 10).forEach(m => console.log(`   ${m}`));

  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: path.join(__dirname, 'error.png') });
  }

  await browser.close();
  console.log('\nDone!');
})();
