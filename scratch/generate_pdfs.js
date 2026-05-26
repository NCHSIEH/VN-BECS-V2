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

const flows = [
    { name: 'master_integration_flow', file: 'master_integration_flow.html', langs: ['en', 'zh', 'vi'] },
    { name: 'specimen_flow', file: 'specimen_flow.html', langs: ['en', 'zh', 'vi'] },
    { name: 'clinical_order_flow', file: 'clinical_order_flow.html', langs: ['en', 'zh', 'vi'] },
    { name: 'blood_bag_flow', file: 'blood_bag_flow.html', langs: ['en', 'zh', 'vi'] }
];

async function generate() {
    console.log('Launching Playwright Chromium browser...');
    const browser = await chromium.launch({ headless: true });
    
    for (const flow of flows) {
        const filePath = path.join(publicDir, flow.file);
        const fileUrl = `file://${filePath}`;
        
        for (const lang of flow.langs) {
            console.log(`Processing ${flow.name} in language [${lang}]...`);
            const page = await browser.newPage();
            
            // Navigate to local HTML file
            await page.goto(fileUrl, { waitUntil: 'networkidle' });
            
            // Click the corresponding language tab in the HTML page
            await page.evaluate((l) => {
                if (typeof switchLanguage === 'function') {
                    switchLanguage(l);
                }
            }, lang);
            
            // Wait for DOM changes to apply
            await page.waitForTimeout(500);
            
            // Output PDF path
            const pdfName = flow.name === 'master_integration_flow_zh' ? 'master_integration_flow_zh.pdf' : `${flow.name}_${lang}.pdf`;
            const pdfPath = path.join(downloadDir, pdfName);
            
            // Generate PDF with beautiful A4 print dimensions
            await page.pdf({
                path: pdfPath,
                format: 'A4',
                landscape: true,
                printBackground: true,
                margin: {
                    top: '0.4in',
                    bottom: '0.4in',
                    left: '0.4in',
                    right: '0.4in'
                }
            });
            
            console.log(`Successfully generated PDF: public/downloads/${pdfName}`);
            await page.close();
        }
    }
    
    await browser.close();
    console.log('All multi-language PDF blueprints successfully generated!');
}

generate().catch(err => {
    console.error('Error generating PDF blueprints:', err);
    process.exit(1);
});
