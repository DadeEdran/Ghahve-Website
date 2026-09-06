/* رندر documentation.html → PDF با Playwright/Chromium، و سپس رستر کردن چند
   صفحهٔ نمونه به PNG برای بازبینی چشمی.

   استفاده:
     node scripts/docs/render.mjs              فقط PDF
     node scripts/docs/render.mjs 1,2,26,171   PDF + عکس این صفحه‌ها */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DOCS = path.join(ROOT, 'docs');
const SHOTS = path.join(HERE, '.shots');
const HTML_IN = path.join(DOCS, 'documentation.html');
const PDF_OUT = path.join(DOCS, 'project-documentation-fa.pdf');
const PORT = 8123;

/* pdf.js را از node_modules برمی‌داریم. با workspaceها معمولاً در ریشه بالا
   کشیده می‌شود، ولی اگر روزی جای دیگری نصب شد هم پیدایش می‌کنیم. */
function pdfjsDir() {
  const tries = [
    path.join(ROOT, 'node_modules', 'pdfjs-dist'),
    path.join(HERE, 'node_modules', 'pdfjs-dist')
  ];
  const hit = tries.find((p) => fs.existsSync(path.join(p, 'build', 'pdf.mjs')));
  if (!hit) {
    throw new Error('pdfjs-dist پیدا نشد — اول `npm install` را در ریشه بزنید.');
  }
  return hit;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.bcmap': 'application/octet-stream'
};

/* صفحهٔ بازبین: PDF ساخته‌شده را با pdf.js روی canvas می‌کشد تا بتوانیم از
   خروجی واقعی — نه از HTML — عکس بگیریم. در حافظه سرو می‌شود تا این پوشه
   فایل موقت نگیرد. */
const VIEWER = `<!doctype html><html><head><meta charset="utf-8">
<style>body{margin:0;background:#6b6156;}canvas{display:block;margin:0 auto 10px;background:#fff;}</style>
</head><body>
<script type="module">
import * as pdfjs from '/pdfjs/build/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/build/pdf.worker.mjs';
window.__render = async function (b64, want, scale) {
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  for (const n of want) {
    if (n > doc.numPages) continue;
    const p = await doc.getPage(n);
    const vp = p.getViewport({ scale });
    const cv = document.createElement('canvas');
    cv.width = Math.floor(vp.width);
    cv.height = Math.floor(vp.height);
    cv.id = 'p' + n;
    document.body.appendChild(cv);
    await p.render({ canvasContext: cv.getContext('2d'), viewport: vp, canvas: cv }).promise;
  }
  return doc.numPages;
};
window.__ready = true;
</script></body></html>`;

function serve(pdfjs) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      if (url === '/' || url === '/viewer.html') {
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(VIEWER);
        return;
      }
      if (!url.startsWith('/pdfjs/')) {
        res.writeHead(404);
        res.end('404');
        return;
      }
      /* جلوی بیرون رفتن از پوشهٔ pdfjs با ../ گرفته می‌شود */
      const rel = path.normalize(url.slice(7)).replace(/^(\.\.[/\\])+/, '');
      const file = path.join(pdfjs, rel);
      if (!file.startsWith(pdfjs)) {
        res.writeHead(403);
        res.end('403');
        return;
      }
      fs.readFile(file, (err, buf) => {
        if (err) {
          res.writeHead(404);
          res.end('404');
          return;
        }
        res.writeHead(200, {
          'Content-Type': MIME[path.extname(file)] || 'application/octet-stream'
        });
        res.end(buf);
      });
    });
    srv.listen(PORT, () => resolve(srv));
  });
}

/* کروم نصب‌شدهٔ سیستم را ترجیح می‌دهیم (فونت‌های سیستمی و رفتار چاپ واقعی)،
   ولی اگر نبود سراغ کرومیوم خود Playwright می‌رویم. */
export async function launch() {
  try {
    return await chromium.launch({ channel: 'chrome' });
  } catch {
    return await chromium.launch();
  }
}

async function main() {
  const pagesArg = process.argv[2];

  if (!fs.existsSync(HTML_IN)) {
    console.error('documentation.html not found — run `npm run docs:build` first.');
    process.exitCode = 1;
    return;
  }
  fs.mkdirSync(SHOTS, { recursive: true });

  const browser = await launch();

  /* ── ۱) HTML → PDF ── */
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text());
  });

  await page.goto(`file:///${HTML_IN.replace(/\\/g, '/')}`, {
    waitUntil: 'load',
    timeout: 120000
  });
  /* صفحه‌بند بعد از سوار شدن فونت‌ها این پرچم را می‌گذارد */
  await page.waitForFunction('document.documentElement.getAttribute("data-ready")==="1"', null, {
    timeout: 120000
  });
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(600);

  const layoutPages = await page.evaluate(() => document.querySelectorAll('.pg').length + 1);
  const overflow = await page.evaluate(() => {
    const bad = [];
    document.querySelectorAll('.pg-body').forEach((b, i) => {
      if (b.scrollHeight > b.clientHeight + 3) bad.push([i + 2, b.scrollHeight - b.clientHeight]);
    });
    return bad;
  });

  await page.pdf({
    path: PDF_OUT,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  console.log('OK PDF written:', path.relative(ROOT, PDF_OUT));
  console.log('   layout pages:', layoutPages);
  if (overflow.length) console.log('   ! overflowing pages:', JSON.stringify(overflow));
  if (errs.length) console.log('   ! page errors:', errs.slice(0, 5));
  await page.close();

  /* ── ۲) PDF → PNG (فقط اگر صفحه‌ای خواسته شده باشد) ── */
  if (pagesArg) {
    const srv = await serve(pdfjsDir());
    const v = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
    const verr = [];
    v.on('pageerror', (e) => verr.push(String(e)));
    await v.goto(`http://localhost:${PORT}/viewer.html`, { waitUntil: 'load' });
    await v.waitForFunction('window.__ready === true', null, { timeout: 60000 });

    const nums = pagesArg.split(',').map((x) => Number(x.trim()));
    const b64 = fs.readFileSync(PDF_OUT).toString('base64');
    const total = await v.evaluate(([d, w]) => window.__render(d, w, 1.6), [b64, nums]);
    console.log('   PDF page count:', total);

    for (const n of nums) {
      const el = await v.$('#p' + n);
      if (!el) {
        console.log('   ! missing canvas for page', n);
        continue;
      }
      await el.screenshot({
        path: path.join(SHOTS, `page-${String(n).padStart(3, '0')}.png`)
      });
    }
    if (verr.length) console.log('   ! viewer errors:', verr.slice(0, 3));
    console.log('OK shots in', path.relative(ROOT, SHOTS));
    srv.close();
  }

  await browser.close();
}

/* check-svg.mjs و zoom.mjs همین launch() را وارد می‌کنند؛ پس رندر فقط وقتی
   اجرا می‌شود که این فایل خودش نقطهٔ شروع باشد، نه هنگام import شدن. */
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
