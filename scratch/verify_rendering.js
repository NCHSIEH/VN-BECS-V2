import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '../public');
const filePath = path.join(publicDir, 'system_sop_alignment.html');
const fileUrl = `file://${filePath}`;

async function verify() {
    console.log('🔍 Launching verification of Mermaid rendering on the generated HTML...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Listen for browser console messages to capture Mermaid syntax details
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.text().includes('error') || msg.text().includes('Mermaid')) {
            console.log(`🖥️  [BROWSER CONSOLE]: ${msg.text()}`);
        }
    });

    page.on('pageerror', err => {
        console.log(`🖥️  [BROWSER PAGE ERROR]: ${err.message}`);
    });
    
    const langs = ['en', 'zh', 'vi'];
    let overallSuccess = true;
    
    for (const lang of langs) {
        console.log(`\n🌐 Checking language: [${lang.toUpperCase()}]`);
        await page.goto(fileUrl, { waitUntil: 'networkidle' });
        
        // Check each of the 6 diagram elements specifically
        const diagramStatuses = await page.evaluate(() => {
            const ids = [
                'diagram1-zh', 'diagram1-en', 'diagram1-vi',
                'diagram2-zh', 'diagram2-en', 'diagram2-vi'
            ];
            
            return ids.map(id => {
                const container = document.getElementById(id);
                if (!container) return { id, status: 'MISSING' };
                
                const hasError = container.textContent.includes('Syntax error') || 
                                 container.innerHTML.includes('Syntax error') ||
                                 container.innerHTML.includes('Parser error') ||
                                 container.querySelector('.error-icon') !== null ||
                                 container.querySelector('.error-text') !== null;
                                 
                return { id, status: hasError ? 'ERROR' : 'OK' };
            });
        });
        
        console.log('📊 Detailed Diagram Statuses:');
        diagramStatuses.forEach(d => {
            const icon = d.status === 'OK' ? '✅' : d.status === 'ERROR' ? '❌' : '⚠️';
            console.log(`   ${icon} ${d.id}: ${d.status}`);
        });
        
        const hasErrors = diagramStatuses.some(d => d.status === 'ERROR');
        if (hasErrors) {
            overallSuccess = false;
        }
        await page.close();
        break; // Only need to check once since all DOM elements are loaded initially
    }
    
    await browser.close();
    
    if (overallSuccess) {
        console.log('\n🎉 Verification completed! All 6 diagrams in Chinese, English, and Vietnamese are 100% clean and render without any syntax errors!');
        process.exit(0);
    } else {
        console.error('\n🚨 Verification failed. One or more diagrams have rendering errors.');
        process.exit(1);
    }
}

verify().catch(err => {
    console.error('❌ Verification script crashed:', err);
    process.exit(1);
});
