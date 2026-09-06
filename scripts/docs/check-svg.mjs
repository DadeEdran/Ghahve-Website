/* بازرسی هندسیِ همهٔ برچسب‌های نمودارها:
   ۱) چه متنی از کادر viewBox بیرون زده (بریده می‌شود)
   ۲) چه دو متنی روی هم افتاده‌اند
   با اندازه‌گیری واقعیِ getBBox در مرورگر، نه با چشم. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './render.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.join(HERE, '..', '..', 'docs', 'documentation.html');

(async () => {
  const b = await launch();
  const p = await b.newPage();
  await p.goto(`file:///${HTML.replace(/\\/g, '/')}`, { waitUntil: 'load', timeout: 180000 });
  await p.waitForFunction('document.documentElement.getAttribute("data-ready")==="1"', null, { timeout: 180000 });

  const out = await p.evaluate(() => {
    const res = { clipped: [], overlaps: [], occluded: [] };
    document.querySelectorAll('figure.dia svg').forEach((svg, di) => {
      const vb = svg.getAttribute('viewBox').split(/\s+/).map(Number);
      const [vx, vy, vw, vh] = vb;
      const cap = (svg.parentElement.querySelector('figcaption') || {}).textContent || '';
      const texts = [...svg.querySelectorAll('text')];
      const boxes = texts.map((t) => {
        let bb;
        try { bb = t.getBBox(); } catch { bb = null; }
        return { t, bb, s: (t.textContent || '').replace(/[\u2066\u2069\u200e\u200f]/g, '').trim() };
      }).filter((o) => o.bb && o.bb.width > 0);

      boxes.forEach((o) => {
        const { bb } = o;
        const over = {
          left: vx - bb.x,
          right: bb.x + bb.width - (vx + vw),
          top: vy - bb.y,
          bottom: bb.y + bb.height - (vy + vh)
        };
        const worst = Math.max(over.left, over.right, over.top, over.bottom);
        if (worst > 0.5) {
          res.clipped.push({
            dia: di, cap: cap.slice(0, 40), text: o.s.slice(0, 50),
            side: Object.keys(over).find((k) => over[k] === worst), by: +worst.toFixed(1),
            x: +bb.x.toFixed(1), w: +bb.width.toFixed(1), vw
          });
        }
      });

      /* SVG به ترتیب سند نقاشی می‌شود: هر <rect> پُرشده که بعد از یک متن بیاید
         روی آن می‌افتد و واژه را نصفه نشان می‌دهد. این دقیقاً همان اشکالی است
         که با چشم به‌سختی پیدا می‌شود، چون متن «بریده» به نظر می‌رسد نه پوشیده. */
      const nodes = [...svg.querySelectorAll('text, rect')];
      boxes.forEach((o) => {
        const ti = nodes.indexOf(o.t);
        nodes.forEach((r, ri) => {
          if (ri <= ti || r.tagName !== 'rect') return;
          const f = r.getAttribute('fill');
          if (!f || f === 'none') return;
          let rb; try { rb = r.getBBox(); } catch { return; }
          const ox = Math.min(o.bb.x + o.bb.width, rb.x + rb.width) - Math.max(o.bb.x, rb.x);
          const oy = Math.min(o.bb.y + o.bb.height, rb.y + rb.height) - Math.max(o.bb.y, rb.y);
          if (ox > 1 && oy > 1) {
            res.occluded.push({
              dia: di, cap: cap.slice(0, 40), text: o.s.slice(0, 46),
              ox: +ox.toFixed(1), oy: +oy.toFixed(1)
            });
          }
        });
      });

      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i].bb, c = boxes[j].bb;
          const ox = Math.min(a.x + a.width, c.x + c.width) - Math.max(a.x, c.x);
          const oy = Math.min(a.y + a.height, c.y + c.height) - Math.max(a.y, c.y);
          if (ox > 1.5 && oy > 1.5) {
            res.overlaps.push({
              dia: di, cap: cap.slice(0, 40),
              a: boxes[i].s.slice(0, 34), b: boxes[j].s.slice(0, 34),
              ox: +ox.toFixed(1), oy: +oy.toFixed(1)
            });
          }
        }
      }
    });
    return res;
  });

  console.log('CLIPPED:', out.clipped.length);
  out.clipped.forEach((c) => console.log(' ', JSON.stringify(c)));
  console.log('OCCLUDED:', out.occluded.length);
  out.occluded.forEach((c) => console.log(' ', JSON.stringify(c)));
  console.log('OVERLAPS:', out.overlaps.length);
  out.overlaps.forEach((c) => console.log(' ', JSON.stringify(c)));
  await b.close();

  /* بریدگی و پوشیدگی واقعاً غلط‌اند و باید خروجی را قرمز کنند. «همپوشانی» اما
     اغلب دو خطِ عمداً روی‌هم‌چیده است که جعبه‌هایشان ۲-۳ نقطه تماس دارند؛
     پس فقط گزارش می‌شود و جلوی ساخت را نمی‌گیرد. */
  if (out.clipped.length || out.occluded.length) process.exitCode = 1;
})();
