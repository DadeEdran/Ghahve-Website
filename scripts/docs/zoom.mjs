/* بزرگ‌نمایی یک ناحیه از یک صفحهٔ PDF — برای بازبینی دقیقِ چیزهایی که در
   عکس تمام‌صفحه دیده نمی‌شوند: جهت متن فارسی، جای پرانتز در خط‌های دوجهته،
   و برخورد برچسب‌های نمودار.

   node scripts/docs/zoom.mjs <page> <x%> <y%> <w%> <h%> [scale] [name]
   مثال (نوار برچسب‌های نمودار معماری در صفحهٔ ۲۶):
   node scripts/docs/zoom.mjs 26 8 8 90 32 4 arch */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { launch } from './render.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const SHOTS = path.join(HERE, '.shots');
const PDF = path.join(ROOT, 'docs', 'project-documentation-fa.pdf');
const PORT = 8126;

function pdfjsDir() {
  const tries = [
    path.join(ROOT, 'node_modules', 'pdfjs-dist'),
    path.join(HERE, 'node_modules', 'pdfjs-dist')
  ];
  const hit = tries.find((p) => fs.existsSync(path.join(p, 'build', 'pdf.mjs')));
  if (!hit) throw new Error('pdfjs-dist پیدا نشد — اول `npm install` را در ریشه بزنید.');
  return hit;
}

const VIEWER = `<!doctype html><html><head><meta charset="utf-8">
<style>body{margin:0;background:#6b6156;}canvas{display:block;margin:0 auto;}</style>
</head><body>
<script type="module">
import * as pdfjs from '/pdfjs/build/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/build/pdf.worker.mjs';
window.__render = async function (b64, n, scale) {
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const p = await doc.getPage(n);
  const vp = p.getViewport({ scale });
  const cv = document.createElement('canvas');
  cv.width = Math.floor(vp.width);
  cv.height = Math.floor(vp.height);
  cv.id = 'pg';
  document.body.appendChild(cv);
  await p.render({ canvasContext: cv.getContext('2d'), viewport: vp, canvas: cv }).promise;
  return doc.numPages;
};
window.__ready = true;
</script></body></html>`;

function serve(pdfjs) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      if (url === '/' || url === '/viewer.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(VIEWER);
        return;
      }
      const rel = path.normalize(url.replace(/^\/pdfjs\//, '')).replace(/^(\.\.[/\\])+/, '');
      fs.readFile(path.join(pdfjs, rel), (err, buf) => {
        if (err) {
          res.writeHead(404);
          res.end('404');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/javascript' });
        res.end(buf);
      });
    });
    srv.listen(PORT, () => resolve(srv));
  });
}

const [pg, x, y, w, h, sc, name] = process.argv.slice(2);
if (!pg) {
  console.error('usage: node scripts/docs/zoom.mjs <page> <x%> <y%> <w%> <h%> [scale] [name]');
  process.exit(1);
}

const scale = Number(sc || 4);
fs.mkdirSync(SHOTS, { recursive: true });

const browser = await launch();
const srv = await serve(pdfjsDir());
const v = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await v.goto(`http://localhost:${PORT}/viewer.html`, { waitUntil: 'load' });
await v.waitForFunction('window.__ready === true', null, { timeout: 60000 });

const b64 = fs.readFileSync(PDF).toString('base64');
await v.evaluate(([d, n, s]) => window.__render(d, n, s), [b64, Number(pg), scale]);

const box = await (await v.$('#pg')).boundingBox();
const clip = {
  x: box.x + (box.width * Number(x ?? 0)) / 100,
  y: box.y + (box.height * Number(y ?? 0)) / 100,
  width: (box.width * Number(w ?? 100)) / 100,
  height: (box.height * Number(h ?? 100)) / 100
};

const out = path.join(SHOTS, `zoom-${name || pg}.png`);
/* fullPage لازم است: در مقیاس بالا، ناحیهٔ خواسته‌شده معمولاً پایین‌تر از
   کادر دید می‌افتد و بدون آن، عکس بریده و خالی درمی‌آید. */
await v.screenshot({ path: out, clip, fullPage: true });
console.log('OK', path.relative(ROOT, out));

await browser.close();
srv.close();
