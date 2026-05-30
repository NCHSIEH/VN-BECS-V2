'use strict';
/**
 * scripts/gen_lims_pdfs.cjs  v2
 * Generate bilingual LIMS user manual PDFs (zh-TW + vi) with Mermaid diagrams.
 *
 * Fixes vs v1:
 *  - Use marked directly (no spawnSync stdout capture issues on Windows)
 *  - Write HTML to temp file + page.goto(file://) instead of page.setContent()
 *    so that external CDN scripts (Mermaid) can actually load
 *
 * Usage: node scripts/gen_lims_pdfs.cjs
 */

const path = require('path');
const fs   = require('fs');
const os   = require('os');

// ─── 1. Locate md-to-pdf npx cache ──────────────────────────────────────────
function findNpxModules() {
  const base = path.join(os.homedir(), 'AppData', 'Local', 'npm-cache', '_npx');
  if (!fs.existsSync(base)) throw new Error('npx cache not found: ' + base);
  for (const dir of fs.readdirSync(base)) {
    if (fs.existsSync(path.join(base, dir, 'node_modules', 'md-to-pdf')))
      return path.join(base, dir, 'node_modules');
  }
  throw new Error('md-to-pdf not found in npx cache. Run: npx md-to-pdf --version first.');
}

const NPX_MODULES = findNpxModules();
const CHROME      = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

// ─── 2. Render Markdown → HTML (using cached marked) ────────────────────────
function renderMarkdown(mdFilePath) {
  const content = fs.readFileSync(mdFilePath, 'utf8');

  // Load marked from npx cache (md-to-pdf bundles marked v4)
  const markedMod = require(path.join(NPX_MODULES, 'marked'));
  // marked v4 exports itself as the top-level function; named exports are on it
  const marked = (typeof markedMod === 'function') ? markedMod
               : (markedMod.marked || markedMod);

  // Reset any previously registered extensions to prevent accumulation
  // across multiple calls in the same process
  if (marked.setOptions) marked.setOptions(marked.getDefaults ? marked.getDefaults() : {});

  // Install mermaid code-block renderer
  marked.use({
    renderer: {
      code(codeOrToken, infostring) {
        // marked v4 passes (code: string, infostring: string)
        // marked v9+ may pass a token object
        const code = typeof codeOrToken === 'object' ? codeOrToken.text : codeOrToken;
        const lang = typeof codeOrToken === 'object' ? codeOrToken.lang  : infostring;
        if (lang === 'mermaid') {
          return `<div class="mermaid">${code.trim()}</div>`;
        }
        return false; // false = fall through to default renderer
      }
    }
  });

  const html = marked.parse ? marked.parse(content) : marked(content);
  if (!html || html.trim().length < 100) {
    throw new Error(`renderMarkdown produced suspiciously short output (${(html||'').length} chars) for ${mdFilePath}`);
  }
  console.log(`  ✎ Markdown rendered: ${html.length.toLocaleString()} chars`);
  return html;
}

// ─── 3. Custom CSS ───────────────────────────────────────────────────────────
const CUSTOM_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Segoe UI', 'Microsoft JhengHei', 'Noto Sans TC', system-ui, sans-serif;
  font-size: 10.5pt;
  line-height: 1.7;
  color: #1e293b;
  background: #fff;
}

/* Cover — uses @page size so it fits exactly 1 A4 page */
.cover {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 270mm;
  background: linear-gradient(150deg, #0f172a 0%, #1e3a5f 45%, #162040 100%);
  color: #fff;
  text-align: center;
  padding: 40px;
  break-after: page;
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
  font-size: 24pt !important;
  font-weight: 700;
  color: #fff !important;
  border: none !important;
  background: none !important;
  padding: 0 !important;
  margin: 0 0 10px !important;
  line-height: 1.25;
}
.cover-sub {
  font-size: 10.5pt;
  color: rgba(255,255,255,0.6);
  font-style: italic;
  margin-bottom: 0;
}
.cover-divider {
  width: 72px; height: 3px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6, #10b981);
  border-radius: 2px;
  margin: 24px auto;
}
.cover-meta-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 5px 18px;
  font-size: 9.5pt;
  text-align: left;
  color: rgba(255,255,255,0.55);
  margin-bottom: 28px;
}
.cover-meta-grid strong { color: rgba(255,255,255,0.8); }
.cover-stages { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.cs { padding: 7px 13px; border-radius: 7px; font-size: 8.5pt; font-weight: 600; }
.cs-donor { background:rgba(59,130,246,0.22);  color:#93c5fd; border:1px solid rgba(59,130,246,0.35); }
.cs-lab   { background:rgba(139,92,246,0.22);  color:#c4b5fd; border:1px solid rgba(139,92,246,0.35); }
.cs-proc  { background:rgba(16,185,129,0.22);  color:#6ee7b7; border:1px solid rgba(16,185,129,0.35); }
.cs-rel   { background:rgba(245,158,11,0.22);  color:#fcd34d; border:1px solid rgba(245,158,11,0.35); }

/* Body */
.doc-body { padding: 0; }

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
  margin: 32px 0 14px;
  background: linear-gradient(90deg,#eff6ff,transparent);
  page-break-after: avoid;
}
h3 {
  font-size: 11pt; font-weight: 600; color: #1d4ed8;
  margin: 20px 0 8px;
  padding-bottom: 4px;
  border-bottom: 1px dashed #bfdbfe;
  page-break-after: avoid;
}
h4 { font-size: 10.5pt; font-weight: 600; color: #2563eb; margin: 14px 0 6px; }
h5 { font-size: 10pt;   font-weight: 600; color: #3b82f6; margin: 10px 0 4px; }

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
  page-break-inside: avoid;
}
th {
  background: linear-gradient(135deg,#1e3a8a,#1e40af);
  color: #fff; padding: 9px 11px;
  text-align: left; font-weight: 600; font-size: 9pt;
}
td { padding: 7px 11px; border: 1px solid #e2e8f0; vertical-align: top; }
tr:nth-child(even) td { background: #f8fafc; }

/* Code */
pre {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #94a3b8;
  border-radius: 0 7px 7px 0;
  padding: 12px 16px; font-size: 8.5pt;
  margin: 12px 0; overflow: auto;
  page-break-inside: avoid;
  white-space: pre-wrap; word-break: break-word;
}
code {
  font-family: Consolas, 'Courier New', monospace;
  font-size: 8.5pt;
  background: #f1f5f9; padding: 1px 5px; border-radius: 3px;
}
pre code { background: none; padding: 0; }

/* Mermaid */
.mermaid {
  text-align: center;
  margin: 16px auto;
  padding: 20px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  page-break-inside: avoid;
  max-width: 100%;
  overflow: hidden;
}
.mermaid svg { max-width: 100% !important; height: auto !important; }

/* Blockquote */
blockquote {
  border-left: 4px solid #3b82f6;
  background: #eff6ff;
  padding: 10px 14px;
  margin: 14px 0;
  border-radius: 0 8px 8px 0;
  color: #1e40af;
}
blockquote p { margin: 0; }

hr { border: none; border-top: 2px solid #e2e8f0; margin: 28px 0; }
strong { font-weight: 700; }

@media print {
  @page { margin: 18mm 14mm; size: A4; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h2, h3 { page-break-after: avoid; }
  .mermaid, table, pre { page-break-inside: avoid; }
}
`;

// ─── 4. HTML Template ────────────────────────────────────────────────────────
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
  <div class="doc-body">
${bodyContent}
  </div>
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
        tertiaryColor: '#d1fae5'
      }
    });
  </script>
</body>
</html>`;
}

// ─── 5. PDF generation via temp file + page.goto(file://) ───────────────────
async function toPdf(html, outPath) {
  const pup = require(path.join(NPX_MODULES, 'puppeteer-core'));

  // Write to temp file so Puppeteer can load it from disk (allows CDN scripts)
  const tmpFile = path.join(os.tmpdir(), `lims_manual_${Date.now()}.html`);
  fs.writeFileSync(tmpFile, html, 'utf8');
  console.log(`  ↳ Temp HTML: ${tmpFile} (${Math.round(html.length / 1024)} KB)`);

  const browser = await pup.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1240, height: 1754 });

    // Load from file:// so external CDN scripts can load
    const fileUrl = 'file:///' + tmpFile.replace(/\\/g, '/');
    console.log(`  ↳ Loading: ${fileUrl}`);
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60000 });

    // Wait for every .mermaid div to contain an SVG
    console.log('  ↳ Waiting for Mermaid...');
    await page.waitForFunction(() => {
      const divs = [...document.querySelectorAll('.mermaid')];
      if (divs.length === 0) return true;
      return divs.every(d => d.querySelector('svg') !== null);
    }, { timeout: 30000 }).catch(e => {
      console.warn(`  ⚠ Mermaid wait timeout (${e.message}) — proceeding`);
    });

    // Extra settle time for layout
    await new Promise(r => setTimeout(r, 1500));

    // Sanity check: count pages we'd expect
    const bodyH = await page.evaluate(() => document.body.scrollHeight);
    console.log(`  ↳ Page body scrollHeight: ${bodyH}px`);

    await page.pdf({
      path: outPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', bottom: '18mm', left: '14mm', right: '14mm' },
    });
    console.log(`  ✅ ${outPath}`);
  } finally {
    await browser.close();
    try { fs.unlinkSync(tmpFile); } catch (_) {}
  }
}

// ─── 6. Document configs ─────────────────────────────────────────────────────
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
  console.log(`\n🔍 npx modules : ${NPX_MODULES}`);
  console.log(`🌐 Chrome      : ${CHROME}\n`);

  for (const cfg of CONFIGS) {
    console.log(`\n📄 ${path.basename(cfg.input)}`);
    const bodyContent = renderMarkdown(cfg.input);
    const html = buildHtml({ ...cfg, bodyContent });
    await toPdf(html, cfg.output);
  }

  console.log('\n🎉 Done.');
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });
