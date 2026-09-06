import { lineKey } from './cartLine.js';

/* ══════════════════════════════════════════════════
   خواندن و نوشتن سبد در حافظهٔ مرورگر.

   ── چرا فایل جدا، و چرا storage پارامتر است ──
   در نسخهٔ ویت این منطق داخل ShopContext بود و
   localStorage را مستقیم صدا می‌زد. آنجا اشکالی نداشت:
   کد فقط در مرورگر اجرا می‌شد.

   با رندر سمت سرور دو چیز عوض شد. یکی اینکه localStorage
   روی سرور وجود ندارد. مهم‌تر اینکه **ترتیب** کارها حالا
   حساس است: اگر پیش از خواندنِ سبدِ ذخیره‌شده چیزی
   نوشته شود، سبد مشتری با یک آرایهٔ خالی پاک می‌شود.

   پس منطق از کامپوننت بیرون کشیده شد و حافظه به‌شکل
   پارامتر تزریق می‌شود — همان کاری که reserveStock در
   سرور با مدل مونگوس می‌کند (قاعدهٔ تست بدون پایگاه داده). حالا
   می‌شود بدون مرورگر و بدون ری‌اکت سنجیدش.
   ══════════════════════════════════════════════════ */

export const CART_KEY = 'ghahve.cart';

/* ── سبدِ ذخیره‌شده را می‌خوانیم ولی به آن اعتماد نمی‌کنیم ──
   هرچه در localStorage است دستِ کاربر بوده و ممکن است
   دستکاری یا از نسخهٔ قدیمی‌تر سایت مانده باشد. پس هر
   ردیف از نو ساخته می‌شود، نه اینکه همان‌طور پذیرفته شود.
   ردیف‌های نامعتبر بعد از رسیدن کالاها هم پاک می‌شوند. */
export function parseCart(raw) {
  let data;
  try {
    data = JSON.parse(raw || '[]');
  } catch {
    return [];
  }

  if (!Array.isArray(data)) return [];

  return data
    .filter((l) => l && typeof l.slug === 'string')
    .map((l) => {
      const mix = Array.isArray(l.mix)
        ? l.mix
            .filter((m) => m && typeof m.slug === 'string')
            .map((m) => ({ slug: m.slug, percent: Math.round(Number(m.percent) || 0) }))
        : [];
      const grind = typeof l.grind === 'string' ? l.grind : '';
      return {
        /* شناسه از نو ساخته می‌شود، نه از فایل خوانده —
           وگرنه ردیفی با شناسهٔ جعلی می‌توانست با ردیف
           دیگری قاطی شود. */
        key: lineKey(l.slug, grind, mix),
        slug: l.slug,
        kind: l.kind,
        grams: Number(l.grams) || 0,
        qty: Number(l.qty) || 0,
        grind,
        mix
      };
    });
}

/**
 * سبد ذخیره‌شده. اگر حافظه‌ای نباشد (سرور) یا خواندنش
 * خطا بدهد (حالت خصوصی مرورگر)، سبد خالی برمی‌گردد.
 */
export function loadCart(storage) {
  if (!storage) return [];
  try {
    return parseCart(storage.getItem(CART_KEY));
  } catch {
    return [];
  }
}

/**
 * ذخیرهٔ سبد. خطا را می‌خورد چون پر شدن سهمیهٔ حافظه یا
 * حالت خصوصی مرورگر نباید فروشگاه را از کار بیندازد.
 */
export function saveCart(storage, cart) {
  if (!storage) return false;
  try {
    storage.setItem(CART_KEY, JSON.stringify(cart));
    return true;
  } catch {
    return false;
  }
}

/** حافظهٔ مرورگر، اگر باشد */
export const browserStorage = () => (typeof window === 'undefined' ? null : window.localStorage);
