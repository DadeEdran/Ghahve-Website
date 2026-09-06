import rateLimit from 'express-rate-limit';

/* ══════════════════════════════════════════════════
   محدودیت نرخ روی دو مسیرِ بی‌محافظ.

   ورود مدیر (مورد ۱ سند ضعف‌ها): بدون این، مهاجم
   می‌تواند هزاران رمز در ثانیه امتحان کند.

   ثبت سفارش (مورد ۲): این مسیر عمداً requireAdmin
   ندارد — مشتری باید بتواند سفارش دهد. اما یک اسکریپت
   ساده می‌تواند هزاران سفارش جعلی بسازد و پنل مدیریت
   را غیرقابل استفاده کند.

   عددها از .env خوانده می‌شوند تا بشود بدون دست زدن
   به کد سفتشان کرد یا شل. پیش‌فرض‌ها همان چیزی‌اند که
   سند پیشنهاد داده: ۵ ورود در ۱۵ دقیقه، ۵ سفارش در
   یک ساعت — هر دو بر پایهٔ IP.
   ══════════════════════════════════════════════════ */

/* عدد از محیط، با پیش‌فرضِ امن اگر خالی یا بی‌معنی بود */
const num = (raw, fallback) => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const MINUTE = 60 * 1000;

/* در تست، محدودیت خاموش است: مجموعهٔ تست باید بتواند
   پشت‌سرهم ده‌ها بار همان مسیر را صدا بزند بدون اینکه
   به ۴۲۹ بخورد. RATE_LIMIT_DISABLED هم برای وقتی است
   که کسی روی ماشین خودش دارد دستی آزمایش می‌کند. */
const isOff = () => process.env.NODE_ENV === 'test' || process.env.RATE_LIMIT_DISABLED === '1';

/* سازندهٔ مشترک — تا هر دو محدودکننده یک رفتار داشته باشند */
function make({ windowMs, limit, error }) {
  return rateLimit({
    windowMs,
    limit,
    /* هدرهای استاندارد RateLimit تا کلاینت بفهمد چقدر
       اعتبار مانده؛ هدرهای قدیمی X-RateLimit لازم نیست. */
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: isOff,
    /* پیام فارسی، با همان شکل { error } که بقیهٔ مسیرها
       برمی‌گردانند تا رابط کاربری فرقی نبیند. */
    message: { error }
  });
}

/* ── ورود مدیر ── */
export const loginLimiter = make({
  windowMs: num(process.env.RATE_LIMIT_LOGIN_WINDOW_MIN, 15) * MINUTE,
  limit: num(process.env.RATE_LIMIT_LOGIN_MAX, 5),
  error: 'تلاش‌های ناموفق زیاد بود. کمی بعد دوباره امتحان کنید.'
});

/* ── ثبت سفارش ── */
export const orderLimiter = make({
  windowMs: num(process.env.RATE_LIMIT_ORDER_WINDOW_MIN, 60) * MINUTE,
  limit: num(process.env.RATE_LIMIT_ORDER_MAX, 5),
  error: 'سفارش‌های زیادی از این دستگاه ثبت شده. لطفاً بعداً دوباره تلاش کنید یا تماس بگیرید.'
});

/* ── پیگیری سفارش (مورد ۳۵) ──
   این مسیر هم مثل ثبت سفارش عمومی است، ولی خطرش فرق
   دارد: نوشتن نیست، حدس زدن است. شمارهٔ سفارش کوتاه
   است و کسی که شمارهٔ موبایل قربانی را دارد می‌تواند
   کدها را یکی‌یکی امتحان کند. سقف اینجا سخاوتمندتر از
   سفارش است (مشتری واقعی ممکن است چند بار غلط تایپ
   کند) ولی آن‌قدر کم که حملهٔ جست‌وجوی فراگیر معنا
   نداشته باشد: ۲۰ تلاش در ۱۵ دقیقه. */
export const trackLimiter = make({
  windowMs: num(process.env.RATE_LIMIT_TRACK_WINDOW_MIN, 15) * MINUTE,
  limit: num(process.env.RATE_LIMIT_TRACK_MAX, 20),
  error: 'تلاش برای پیگیری زیاد بود. چند دقیقه دیگر دوباره امتحان کنید.'
});
