import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '../public');
const downloadDir = path.join(publicDir, 'downloads');

if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
}

const languages = ['zh', 'en', 'vi'];

async function capture() {
    console.log('Launching Playwright Chromium browser for high-res JPG capture...');
    
    // We launch chromium and set a deviceScaleFactor of 3.0 for retina-quality, high-DPI printable rendering
    const browser = await chromium.launch({ headless: true });
    
    for (const lang of languages) {
        console.log(`Processing high-res JPG for language: [${lang}]...`);
        const page = await browser.newPage({
            viewport: { width: 1250, height: 1600 },
            deviceScaleFactor: 3 // 3x scale factor creates extremely high-resolution, print-ready graphics!
        });
        
        const filePath = path.join(publicDir, 'master_integration_flow.html');
        const fileUrl = `file://${filePath}`;
        
        await page.goto(fileUrl, { waitUntil: 'networkidle' });
        
        // Dynamically switch the language on the page
        await page.evaluate((l) => {
            switchLanguage(l);
            
            // Hide the Print button for a pristine, clean output image
            const btn = document.querySelector('.print-btn');
            if (btn) btn.style.display = 'none';
        }, lang);
        
        // Small delay for DOM layout to settle with larger fonts
        await page.waitForTimeout(600);
        
        const jpgName = `master_integration_flow_${lang}.jpg`;
        const jpgPath = path.join(downloadDir, jpgName);
        
        console.log(`Saving high-DPI screen capture: public/downloads/${jpgName}...`);
        await page.screenshot({
            path: jpgPath,
            type: 'jpeg',
            quality: 95,
            fullPage: true
        });
        
        console.log(`Successfully generated high-resolution JPG: public/downloads/${jpgName}`);
        await page.close();
    }
    
    await browser.close();
    console.log('All three multi-language high-res JPGs successfully captured!');
}

capture().catch(err => {
    console.error('Error generating high-resolution JPG blueprints:', err);
    process.exit(1);
});
