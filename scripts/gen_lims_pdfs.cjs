'use strict';
/**
 * scripts/gen_lims_pdfs.cjs
 * Generate bilingual LIMS user manual PDFs (zh-TW + vi) with Mermaid diagrams.
 * Uses puppeteer-core from md-to-pdf npx cache + system Chrome.
 *
 * Usage: node scripts/gen_lims_pdfs.cjs
 */

const path  = require('path');
const fs    = require('fs');
const os    = require('os');
const { spawnSync } = require('child_process');

// ─── 1. Locate md-to-pdf npx cache ──────────────────────────────────────────
function findNpxModules() {
  const base = path.join(os.homedir(), 'AppData', 'Local', 'npm-cache', '_npx');
  if (!fs.existsSync(base)) throw new Error(`npx cache not found: ${base}`);
  for (const dir of fs.readdirSync(base)) {
    const probe = path.join(base, dir, 'node_modules', 'md-to-pdf');
    if (fs.existsSync(probe)) return path.join(base, dir, 'node_modules');
  }
  throw new Error('md-to-pdf not found in npx cache. Run: npx md-to-pdf --version');
}

const NPX_MODULES = findNpxModules();
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

// ─── 2. Custom CSS ───────────────────────────────────────────────────────────
const CUSTOM_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Segoe UI', 'Microsoft JhengHei', 'Noto Sans TC', system-ui, sans-serif;
  font-size: 10.5pt;
  line-height: 1.7;
  color: #1e293b;
  background: #fff;
}

/* Cover page */
.cover {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(150deg, #0f172a 0%, #1e3a5f 45%, #162040 100%);
  color: #fff;
  text-align: center;
  padding: 48px 40px;
  page-break-after: always;
}
.cover-badge {
  background: rgba(59,130,246,0.18);
  border: 1px solid rgba(59,130,246,0.4);
  color: #93c5fd;
  font-size: 8.5pt;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  padding: 6px 18px;
  border-radius: 20px;
  margin-bottom: 28px;
  font-weight: 600;
}
.cover h1 {
  font-size: 26pt;
  font-weight: 700;
  color: #fff;
  border: none !important;
  padding: 0 !important;
  margin: 0 0 10px !important;
  line-height: 1.25;
}
.cover-sub {
  font-size: 11pt;
  color: rgba(255,255,255,0.6);
  margin-bottom: 0;
  font-style: italic;
}
.cover-divider {
  width: 72px;
  height: 3px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6, #10b981);
  border-radius: 2px;
  margin: 28px auto;
}
.cover-meta-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 20px;
  font-size: 9.5pt;
  text-align: left;
  color: rgba(255,255,255,0.55);
  margin-bottom: 32px;
}
.cover-meta-grid strong { color: rgba(255,255,255,0.8); }
.cover-stages {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}
.cs { padding: 7px 14px; border-radius: 7px; font-size: 9pt; font-weight: 600; }
.cs-donor  { background:rgba(59,130,246,0.22);  color:#93c5fd;  border:1px solid rgba(59,130,246,0.35); }
.cs-lab    { background:rgba(139,92,246,0.22);  color:#c4b5fd;  border:1px solid rgba(139,92,246,0.35); }
.cs-proc   { background:rgba(16,185,129,0.22);  color:#6ee7b7;  border:1px solid rgba(16,185,129,0.35); }
.cs-rel    { background:rgba(245,158,11,0.22);  color:#fcd34d;  border:1px solid rgba(245,158,11,0.35); }

/* Document body */
.doc-body { padding: 8mm 0; }

/* Headings */
h1 {
  font-size: 17pt; font-weight: 700; color: #0f172a;
  border-bottom: 3px solid #3b82f6;
  padding-bottom: 10px; margin: 0 0 20px;
}
h2 {
  font-size: 13pt; font-weight: 700; color: #1e40af;
  border-left: 5px solid #3b82f6;
  padding: 5px 0 5px 12px;
  margin: 34px 0 14px;
  background: linear-gradient(90deg,#eff6ff 0%,transparent 100%);
  page-break-after: avoid;
}
h3 {
  font-size: 11pt; font-weight: 600; color: #1d4ed8;
  margin: 22px 0 8px;
  padding-bottom: 4px;
  border-bottom: 1px dashed #bfdbfe;
  page-break-after: avoid;
}
h4 { font-size: 10.5pt; font-weight: 600; color: #2563eb; margin: 14px 0 6px; }
h5 { font-size: 10pt; font-weight: 600; color: #3b82f6; margin: 10px 0 4px; }

p { margin-bottom: 9px; }
ul, ol { padding-left: 22px; margin-bottom: 10px; }
li { margin-bottom: 4px; }

/* Tables */
table {
  width: 100%; border-collapse: collapse;
  margin: 12px 0 18px;
  font-size: 9.5pt;
  border-radius: 7px; overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.09);
}
th {
  background: linear-gradient(135deg, #1e3a8a, #1e40af);
  color: #fff; padding: 9px 11px;
  text-align: left; font-weight: 600; font-size: 9pt; letter-spacing: 0.02em;
}
td { padding: 7px 11px; border: 1px solid #e2e8f0; vertical-align: top; }
tr:nth-child(even) td { background: #f8fafc; }
tr:hover td { background: #eff6ff; }

/* Code */
pre {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #94a3b8;
  border-radius: 0 7px 7px 0;
  padding: 12px 16px; font-size: 8.5pt;
  margin: 12px 0; overflow: auto;
  page-break-inside: avoid;
}
code {
  font-family: 'Cascadia Code', 'Consolas', 'Courier New', monospace;
  font-size: 8.5pt;
  background: #f1f5f9; padding: 1px 5px; border-radius: 3px;
}
pre code { background: none; padding: 0; }

/* Mermaid */
.mermaid {
  text-align: center;
  margin: 18px auto;
  padding: 20px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  page-break-inside: avoid;
  max-width: 100%;
}
.mermaid svg { max-width: 100%; height: auto; }

/* Blockquote */
blockquote {
  border-left: 4px solid #3b82f6;
  background: #eff6ff;
  padding: 10px 14px;
  margin: 14px 0;
  border-radius: 0 8px 8px 0;
  color: #1e40af;
  font-style: italic;
}
blockquote p { margin: 0; }

hr { border: none; border-top: 2px solid #e2e8f0; margin: 28px 0; }
strong { font-weight: 700; }

@media print {
  @page { margin: 18mm 14mm; size: A4; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h2 { page-break-before: auto; }
  .mermaid, table, pre { page-break-inside: avoid; }
}
`;

// ─── 3. HTML Template ────────────────────────────────────────────────────────
function buildHtml({ lang, title, subtitle, metaRows, stagesHtml, bodyContent }) {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>${CUSTOM_CSS}</style>
</head>
<body>
  <div class="cover">
    <div class="cover-badge">VN-BECS V2 &nbsp;·&nbsp; UM-LIMS-01</div>
    <h1>${title}</h1>
    <p class="cover-sub">${subtitle}</p>
    <div class="cover-divider"></div>
    <div class="cover-meta-grid">${metaRows}</div>
    <div class="cover-stages">${stagesHtml}</div>
  </div>
  <div class="doc-body">${bodyContent}</div>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'neutral',
      flowchart: { curve: 'basis', padding: 18, nodeSpacing: 55, rankSpacing: 55 },
      themeVariables: {
        fontFamily: '"Segoe UI","Microsoft JhengHei",system-ui,sans-serif',
        fontSize: '13px',
        primaryColor: '#dbeafe',
        primaryTextColor: '#0f172a',
        primaryBorderColor: '#3b82f6',
        lineColor: '#64748b',
        secondaryColor: '#ede9fe',
        tertiaryColor: '#d1fae5',
        edgeLabelBackground: '#f8fafc'
      }
    });
  </script>
</body>
</html>`;
}

// ─── 4. Markdown → HTML helpers ─────────────────────────────────────────────
function renderMd(mdFile) {
  const r = spawnSync('npx', ['md-to-pdf', mdFile, '--as-html'], {
    encoding: 'utf8', maxBuffer: 12 * 1024 * 1024, shell: true, timeout: 90000
  });
  if (r.status !== 0) throw new Error(`md-to-pdf error (${r.status}): ${r.stderr}`);
  return r.stdout;
}

function extractBody(html) {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return m ? m[1].trim() : html;
}

function htmlDecode(s) {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&#x2F;/g, '/');
}

function fixMermaid(html) {
  return html.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/gi,
    (_, code) => `<div class="mermaid">${htmlDecode(code).trim()}</div>`
  );
}

// ─── 5. PDF generation ──────────────────────────────────────────────────────
async function toPdf(html, outPath) {
  const pup = require(path.join(NPX_MODULES, 'puppeteer-core'));
  const browser = await pup.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1240, height: 1754 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });

    // Wait until every .mermaid div has an <svg> child
    await page.waitForFunction(() => {
      const divs = [...document.querySelectorAll('.mermaid')];
      return divs.length === 0 || divs.every(d => d.querySelector('svg'));
    }, { timeout: 30000 }).catch(() => {
      console.warn('  ⚠ Mermaid timeout — continuing without full render');
    });

    await page.pdf({
      path: outPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', bottom: '18mm', left: '14mm', right: '14mm' },
    });
    console.log(`  ✅ ${outPath}`);
  } finally {
    await browser.close();
  }
}

// ─── 6. Configs ─────────────────────────────────────────────────────────────
const DOCS = path.resolve(__dirname, '../docs/user-manual');

const CONFIGS = [
  {
    input:  path.join(DOCS, 'donor-center-lims.zh-TW.md'),
    output: path.join(DOCS, 'donor-center-lims.zh-TW.pdf'),
    lang: 'zh-TW',
    title: '捐血中心 LIMS 使用手冊',
    subtitle: 'Donor Center Laboratory Information Management System',
    metaRows: `
      <strong>文件編號</strong><span>UM-LIMS-01</span>
      <strong>版本</strong><span>1.1</span>
      <strong>更新日期</strong><span>2026-05-30</span>
      <strong>系統版本</strong><span>VN-BECS V2</span>
      <strong>語系</strong><span>繁體中文</span>
    `,
    stagesHtml: `
      <div class="cs cs-donor">🩸 DONOR 捐血者登記</div>
      <div class="cs cs-lab">🔬 LAB 血清學檢測</div>
      <div class="cs cs-proc">⚗️ PROCESS 成分製備</div>
      <div class="cs cs-rel">🚚 RELEASE 發血移交</div>
    `,
  },
  {
    input:  path.join(DOCS, 'donor-center-lims.vi.md'),
    output: path.join(DOCS, 'donor-center-lims.vi.pdf'),
    lang: 'vi',
    title: 'Hướng dẫn Sử dụng LIMS Trung tâm Hiến máu',
    subtitle: 'Donor Center Laboratory Information Management System',
    metaRows: `
      <strong>Mã tài liệu</strong><span>UM-LIMS-01</span>
      <strong>Phiên bản</strong><span>1.1</span>
      <strong>Cập nhật</strong><span>2026-05-30</span>
      <strong>Phiên bản hệ thống</strong><span>VN-BECS V2</span>
      <strong>Ngôn ngữ</strong><span>Tiếng Việt</span>
    `,
    stagesHtml: `
      <div class="cs cs-donor">🩸 DONOR Đăng ký</div>
      <div class="cs cs-lab">🔬 LAB Xét nghiệm</div>
      <div class="cs cs-proc">⚗️ PROCESS Chế biến</div>
      <div class="cs cs-rel">🚚 RELEASE Phát máu</div>
    `,
  },
];

// ─── 7. Main ─────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔍 Using npx modules: ${NPX_MODULES}`);
  console.log(`🌐 Chrome: ${CHROME_PATH}\n`);

  for (const cfg of CONFIGS) {
    console.log(`📄 Processing: ${path.basename(cfg.input)}`);
    const rawHtml = renderMd(cfg.input);
    const body    = fixMermaid(extractBody(rawHtml));
    const full    = buildHtml({ ...cfg, bodyContent: body });
    await toPdf(full, cfg.output);
  }

  console.log('\n🎉 All PDFs generated.');
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });
