/* ══════════════════════════════════════════════════
   تصمیم CORS، جدا از راه‌اندازی سرور.

   چرا یک فایل جدا برای سه خط منطق؟ چون این سه خط تنها
   جایی است که تصمیم می‌گیرد «چه کسی حق دارد به API ما
   درخواست بزند» — و تصمیمی که process.exit صدا می‌زند
   داخل index.js تست‌پذیر نیست.

   قاعده: در تولید نبودِ CLIENT_ORIGIN خطای مرگبار است،
   نه پیش‌فرضِ نرم. قبلاً به origin:true تبدیل می‌شد یعنی
   «هر مبدأیی مجاز است» — یک تنظیمِ جاافتاده، بی هیچ
   هشداری، در را برای هر سایتی باز می‌گذاشت.

   در توسعه هنوز true می‌ماند تا کسی که تازه مخزن را
   کلون کرده، بدون .env هم بتواند اجرا کند.
   ══════════════════════════════════════════════════ */

/** فهرست مبدأهای مجاز از روی متغیر محیطی؛ خالی یعنی تنظیم‌نشده */
export function parseOrigins(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * مقدار مناسب برای گزینهٔ origin در میان‌افزار cors.
 * در تولید، اگر مبدأیی تعریف نشده باشد throw می‌کند.
 */
export function resolveCorsOrigin(env = process.env) {
  const origins = parseOrigins(env.CLIENT_ORIGIN);

  if (!origins.length && env.NODE_ENV === 'production') {
    throw new Error('CLIENT_ORIGIN must be set in production');
  }

  return origins.length ? origins : true;
}
