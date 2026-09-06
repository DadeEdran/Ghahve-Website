/* تصویر پیش‌نمایش لینک (og:image) را می‌سازد.

   استفاده:
     node scripts/og-image.mjs

   خروجی: web/public/img/og-default.png — همان ۱۲۰۰×۶۳۰ ای که
   تلگرام، واتساپ و توییتر کنار لینک نشان می‌دهند.

   ── چرا اسکریپت و نه یک فایل دستی؟ ──
   تصویر کارت کالاها در مرورگر و به شکل SVG ساخته می‌شود؛ نه فایلی
   دارد که بشود آدرسش را داد و نه پیش‌نمایش‌سازها SVG را رندر
   می‌کنند. پس یک تصویر رستریِ ثابت لازم است. ساختنش با کد یعنی اگر
   روزی رنگ یا نام برند عوض شد، با یک دستور دوباره ساخته می‌شود و
   کسی مجبور نیست فتوشاپ باز کند.

   فونت از همان فایل‌های محلیِ ساخت مستندات می‌آید (base64 داخل HTML)
   تا رندر به شبکه وابسته نباشد.

   خروجی در مخزن نگه داشته می‌شود، چون هم npm run build آن را لازم
   دارد و هم اجرای این اسکریپت به Chromium نیاز دارد. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const FONTS = path.join(HERE, 'docs', 'fonts');
const OUT = path.join(ROOT, 'web', 'public', 'img', 'og-default.png');

const WIDTH = 1200;
const HEIGHT = 630;

const font = (file) => fs.readFileSync(path.join(FONTS, file)).toString('base64');

/* پالت دقیقاً همان توکن‌های web/src/style.css است */
const html = `<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Vazirmatn';
    src: url(data:font/ttf;base64,${font('Vazirmatn-Bold.ttf')}) format('truetype');
    font-weight: 700;
  }
  @font-face {
    font-family: 'Vazirmatn';
    src: url(data:font/ttf;base64,${font('Vazirmatn-Regular.ttf')}) format('truetype');
    font-weight: 400;
  }

  * { box-sizing: border-box; margin: 0; }

  body {
    width: ${WIDTH}px; height: ${HEIGHT}px;
    font-family: 'Vazirmatn', sans-serif;
    background: #f6efe3;
    color: #1e1710;
    display: flex; align-items: center; gap: 54px;
    padding: 0 84px;
    position: relative;
    overflow: hidden;
  }

  /* نوار برنجی لبهٔ راست — همان لهجهٔ بصری سایت */
  body::before {
    content: ''; position: absolute; inset-block: 0; inset-inline-start: 0;
    width: 18px; background: linear-gradient(#c8963c, #b23a2b);
  }

  /* دانه‌های محو در پس‌زمینه */
  .bg { position: absolute; inset: 0; opacity: .1; }

  .mark { flex: none; color: #b23a2b; }

  .text { position: relative; }
  h1 { font-size: 78px; font-weight: 700; line-height: 1.15; letter-spacing: -1px; }
  p  { font-size: 34px; font-weight: 400; color: #6b5b45; margin-top: 18px; }

  .rule { width: 120px; height: 5px; background: #c8963c; border-radius: 3px; margin-top: 34px; }
  .foot { font-size: 26px; color: #5c6b47; margin-top: 26px; }
</style></head>
<body>
  <svg class="bg" viewBox="0 0 1200 630" aria-hidden="true">
    <g fill="#c9a87c">
      <ellipse cx="1050" cy="120" rx="90" ry="62" transform="rotate(-24 1050 120)"/>
      <ellipse cx="1140" cy="300" rx="70" ry="48" transform="rotate(14 1140 300)"/>
      <ellipse cx="960" cy="520" rx="104" ry="70" transform="rotate(-8 960 520)"/>
    </g>
  </svg>

  <svg class="mark" width="200" height="200" viewBox="0 0 40 40" aria-hidden="true">
    <path d="M20 6c6 0 9 4 9 9s-4 6-4 10a5 5 0 0 1-10 0c0-4-4-5-4-10s3-9 9-9Z"
          fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="M20 8v20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M8 33h24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>

  <div class="text">
    <h1>رُست‌خانهٔ دانه</h1>
    <p>قهوهٔ تخصصی، به گرم و کیلو</p>
    <div class="rule"></div>
    <div class="foot">بیش از ۳۰ خاستگاه و میکس · رست‌شدهٔ همین هفته</div>
  </div>
</body></html>`;

/* اول کروم نصب‌شدهٔ خودِ سیستم را امتحان می‌کنیم و بعد
   مرورگر خودِ Playwright را. جای شبکه‌بسته، دانلود
   Chromium شکست می‌خورد ولی کروم معمولاً همان‌جا هست. */
async function launch() {
  try {
    return await chromium.launch({ channel: 'chrome' });
  } catch {
    return await chromium.launch();
  }
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: OUT });
await browser.close();

/* انگلیسی، چون خروجی خط فرمان است */
console.log(`OK  ${path.relative(ROOT, OUT)} (${WIDTH}x${HEIGHT})`);
