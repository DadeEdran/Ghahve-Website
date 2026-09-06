import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* ══════════════════════════════════════════════════
   پیکربندی Next (مورد ۲۶).

   Next فقط جای **کلاینت** را می‌گیرد. Express همچنان
   تنها چیزی است که با مونگو حرف می‌زند و همهٔ مسیرهای
   /api و /uploads و همچنین sitemap.xml و robots.txt
   مالِ اوست.
   ══════════════════════════════════════════════════ */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* آدرس سرور Express. در توسعه همان لوکال‌هاست است؛ در
   تولید اگر Next و Express روی یک ماشین نباشند، این را
   در محیط تنظیم کنید. */
const API_URL = process.env.API_URL || 'http://localhost:4000';

export default {
  reactStrictMode: true,

  /* پروژه یک npm workspace است و node_modules در ریشه
     هویست می‌شود. بدون این، Next ریشهٔ ردیابی فایل‌ها را
     خودش حدس می‌زند و روی workspace هشدار می‌دهد. */
  outputFileTracingRoot: path.join(__dirname, '..'),

  /* منطق مشترک (قیمت، دسته‌بندی، متن سئو) از یک بستهٔ
     محلی می‌آید که ترنسپایل‌نشده است. */
  transpilePackages: ['@ghahve/shared'],

  /* ══════════════════════════════════════════════════
     بهینه‌سازی تصویر (نیمهٔ دوم مورد ۲۴).

     عکس آپلودیِ مدیر تا چهار مگابایت است و در قابی
     نشان داده می‌شود که بزرگ‌ترینش ۳۶۰ پیکسل عرض دارد.
     تا حالا همان فایل خام روی سیم می‌رفت. حالا از
     /_next/image رد می‌شود.

     ── مسیر داخلی، نه بیرونی ──
     بهینه‌ساز برای آدرس‌های محلی درخواست را از **همین**
     مسیریاب Next رد می‌کند، یعنی از همان rewrite پایین.
     پس /uploads/x.jpg به Express می‌رسد بدون اینکه
     آدرس داخلی Express به مرورگر درز کند و بدون اینکه
     remotePatterns لازم شود.

     ── چه چیزی عمداً تنگ شد ──
     بدون localPatterns هر مسیر محلی‌ای بهینه‌شدنی است و
     /_next/image عملاً یک واکشیِ عمومی می‌شود. دو الگوی
     زیر تنها جاهایی‌اند که تصویر واقعی از آن می‌آید.

     ── چه چیزی عمداً دست نخورد ──
     dangerouslyAllowSVG خاموش می‌ماند (مورد ۵: SVG سند
     اجراشدنی است)، و contentDispositionType و
     contentSecurityPolicy پیش‌فرضِ Next اند که همان
     سیاست sandbox پوشهٔ uploads را می‌دهند. کد
     web/src/lib/img.js مطمئن می‌شود هیچ SVG ای اصلاً به
     اینجا نرسد.
     ══════════════════════════════════════════════════ */
  images: {
    /* به ترتیب اولویت: مرورگری که AVIF بفهمد AVIF
       می‌گیرد، وگرنه WebP، وگرنه همان قالب اصلی. */
    formats: ['image/avif', 'image/webp'],

    localPatterns: [{ pathname: '/uploads/**' }, { pathname: '/img/**' }],

    /* ۴۴۸ به فهرست پیش‌فرض اضافه شده و بی‌دلیل نیست:
       کارت فهرست روی دسکتاپ ۳۸۵ پیکسل و روی تبلت تا ۴۳۱
       پیکسل عرض می‌گیرد. با فهرست پیش‌فرض، نزدیک‌ترین
       نسخهٔ بزرگ‌ترِ هر دو ۶۴۰ بود — یعنی مرورگر برای یک
       قاب ۳۸۵ پیکسلی عکس ۶۴۰ پیکسلی می‌گرفت. */
    imageSizes: [32, 48, 64, 96, 128, 256, 384, 448],

    /* هم‌تراز با maxAge پوشهٔ uploads در سرور (۷ روز).
       نام فایل آپلودی تصادفی است و هیچ‌وقت بازنویسی
       نمی‌شود، پس کش طولانی بی‌خطر است. */
    minimumCacheTTL: 604800
  },

  /* ══════════════════════════════════════════════════
     هدرهای پاسخِ بهینه‌ساز.

     تصویرهای /uploads دو لایه محافظ داشتند (پای
     setUploadHeaders در server/src/lib/upload.js). حالا
     مرورگر دیگر مستقیم آن آدرس را نمی‌خواند و پاسخ را
     از /_next/image می‌گیرد — پس هدرهای Express روی آن
     پاسخ نیستند.

     خودِ Next دوتای مهم را می‌گذارد: همان CSP
     «script-src 'none'; frame-src 'none'; sandbox» و
     Content-Disposition: attachment. دوتای دیگر را
     نمی‌گذارد و اینجا اضافه می‌شوند تا سیاست هر دو راه
     یکی بماند. (میان‌افزار proxy.js عمداً _next/image را
     رد می‌کند، پس این کار از آنجا برنمی‌آمد.)
     ══════════════════════════════════════════════════ */
  async headers() {
    return [
      {
        source: '/_next/image',
        headers: [
          { key: 'x-content-type-options', value: 'nosniff' },
          { key: 'cross-origin-resource-policy', value: 'same-origin' },
          { key: 'x-frame-options', value: 'DENY' }
        ]
      }
    ];
  },

  /* ── همان پراکسیِ vite.config.js ──
     مرورگر همچنان به /api و /uploads نسبی درخواست می‌زند،
     پس lib/api.js دست‌نخورده منتقل می‌شود و مسئلهٔ CORS
     اصلاً پیش نمی‌آید: از دید مرورگر همه‌چیز یک مبدأ است.

     sitemap.xml و robots.txt هم به Express می‌روند —
     همان‌جا از فهرست زندهٔ کالاها ساخته می‌شوند و دلیلی
     برای دو نسخه شدنشان نیست. */
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
      { source: '/uploads/:path*', destination: `${API_URL}/uploads/:path*` },
      { source: '/sitemap.xml', destination: `${API_URL}/sitemap.xml` },
      { source: '/robots.txt', destination: `${API_URL}/robots.txt` }
    ];
  }
};
