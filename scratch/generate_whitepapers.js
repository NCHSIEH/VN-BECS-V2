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

const whitepaper = {
    file: 'system_sop_alignment.html',
    name: 'system_sop_alignment',
    langs: ['en', 'zh', 'vi']
};

async function generate() {
    console.log('🚀 Launching Playwright Chromium for high-res PDF generation...');
    const browser = await chromium.launch({ headless: true });
    
    const filePath = path.join(publicDir, whitepaper.file);
    const fileUrl = `file://${filePath}`;
    
    for (const lang of whitepaper.langs) {
        console.log(`\n📄 [Processing] Language [${lang.toUpperCase()}] for ${whitepaper.name}...`);
        const page = await browser.newPage();
        
        // Navigate to the local whitepaper HTML
        await page.goto(fileUrl, { waitUntil: 'networkidle' });
        
        // Execute dynamic language translation switch
        await page.evaluate((l) => {
            if (typeof switchLanguage === 'function') {
                switchLanguage(l);
            }
        }, lang);
        
        // Wait for DOM transformations, translations, and typography renders to complete
        await page.waitForTimeout(1000);
        
        // Set file output path
        const pdfName = `${whitepaper.name}_${lang}.pdf`;
        const pdfPath = path.join(downloadDir, pdfName);
        
        console.log(`🖨️  [Printing] Compiling high-res A4 Portrait PDF for ${pdfName}...`);
        
        // Print PDF with high-contrast, elegant A4 Portrait grid margins
        await page.pdf({
            path: pdfPath,
            format: 'A4',
            landscape: false, // Portrait is best for long, detailed text whitepapers
            printBackground: true,
            margin: {
                top: '0.5in',
                bottom: '0.5in',
                left: '0.5in',
                right: '0.5in'
            }
        });
        
        console.log(`✅ [Success] Generated: public/downloads/${pdfName} (${fs.statSync(pdfPath).size} bytes)`);
        await page.close();
    }
    
    await browser.close();
    console.log('\n🌟 All three high-resolution multi-language PDFs successfully generated!');
}

generate().catch(err => {
    console.error('❌ Error generating whitepaper PDFs:', err);
    process.exit(1);
});
