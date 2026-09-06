import { NextResponse } from 'next/server';

/* ══════════════════════════════════════════════════
   هدرهای امنیتی — همان سیاستی که helmet در Express
   دارد، ولی با nonce.

   ── چرا اصلاً لازم شد ──
   سیاست فعلی سرور می‌گوید script-src 'self'. برای یک
   باندل ویت کافی بود چون هیچ اسکریپت درون‌خطی نداشت.
   Next اما دادهٔ رندر سمت سرور را به شکل چند
   <script> درون‌خطی داخل صفحه می‌گذارد، و آن سیاست
   دقیقاً همان‌ها را می‌بست — یعنی صفحه اصلاً بالا
   نمی‌آمد.

   راه ساده این بود که 'unsafe-inline' اضافه شود. این
   کار عملاً کل ارزش سیاست را دور می‌ریخت (مورد ۷ سند
   ضعف‌ها عمداً آن را نداشت). به‌جایش هر درخواست یک
   nonce تازه می‌گیرد: تنها اسکریپتی اجرا می‌شود که
   همان nonce را داشته باشد.

   Next خودش nonce را از هدرِ **درخواست** برمی‌دارد و
   روی اسکریپت‌هایش می‌گذارد؛ برای همین همان رشته هم
   روی request ست می‌شود و هم روی response.

   ── چه چیزهایی عمداً باز مانده‌اند ──
   • style-src با 'unsafe-inline' — استایل درون‌خطی
     داریم (نوار نمودار گزارش، متغیرهای CSS حالت
     تصویری میکس). صفتِ style با nonce کار نمی‌کند.
   • img-src با data: — تصویر تولیدی SVG کارت‌ها و
     بافت نویز در style.css.

   ── چه چیزی نسبت به Express بسته‌تر شد ──
   font-src دیگر fonts.gstatic.com را ندارد و
   style-src دیگر fonts.googleapis.com را: فونت‌ها با
   next/font روی همین دامنه میزبانی می‌شوند (مورد ۲۵).
   ══════════════════════════════════════════════════ */

const isDev = process.env.NODE_ENV !== 'production';

function policyFor(nonce) {
  const script = [
    "'self'",
    `'nonce-${nonce}'`,
    /* اسکریپتی که خودش اسکریپت دیگری می‌سازد (باندل‌های
       Next) با strict-dynamic اعتبار nonce را به ارث
       می‌برد؛ بدون آن باید تک‌تکشان را نام می‌بردیم. */
    "'strict-dynamic'",
    /* فقط در توسعه: بازآوری داغِ Next بدون eval کار
       نمی‌کند. در تولید هیچ‌وقت اضافه نمی‌شود. */
    isDev ? "'unsafe-eval'" : ''
  ]
    .filter(Boolean)
    .join(' ');

  /* وب‌سوکت فقط برای بازآوری داغ در توسعه */
  const connect = isDev ? "'self' ws: wss:" : "'self'";

  return [
    "default-src 'self'",
    `script-src ${script}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src ${connect}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    isDev ? '' : 'upgrade-insecure-requests'
  ]
    .filter(Boolean)
    .join('; ');
}

export function proxy(request) {
  /* یک nonce تازه برای هر درخواست. تکرارش بین دو
     بازدیدکننده یعنی سیاست بی‌اثر. */
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = policyFor(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', csp);

  /* بقیهٔ هدرهایی که helmet در Express می‌گذاشت و
     Next خودش نمی‌گذارد. */
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('referrer-policy', 'no-referrer');
  response.headers.set('x-frame-options', 'SAMEORIGIN');
  if (!isDev) {
    /* فقط روی https معنا دارد؛ در توسعه گذاشتنش یعنی
       قفل شدن دامنهٔ localhost برای پروژه‌های دیگر. */
    response.headers.set('strict-transport-security', 'max-age=15552000; includeSubDomains');
  }

  return response;
}

export const config = {
  /* مسیرهایی که Express جواب می‌دهد یا فایل ایستا هستند
     از این میان‌افزار رد نمی‌شوند: نه nonce لازم دارند نه
     سیاست. */
  matcher: ['/((?!api|uploads|img|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)']
};
