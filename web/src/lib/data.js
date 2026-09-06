import { cache } from 'react';

/* ══════════════════════════════════════════════════
   خواندن داده روی سرور.

   این فایل فقط در کامپوننت‌های سروری استفاده می‌شود.
   مرورگر راه خودش را دارد: lib/api.js با آدرس‌های نسبی.
   دو فایل، چون دو محیط — نه چون دو نسخه‌اند.

   ── چرا آدرس مطلق ──
   fetch روی سرور «مبدأ صفحه» ندارد؛ /api/items برایش
   معنایی ندارد. پس آدرس Express از محیط می‌آید. در
   مرورگر هیچ‌وقت این فایل اجرا نمی‌شود، پس نشتِ آدرس
   داخلی به کلاینت هم ممکن نیست.

   ── چرا cache ──
   generateMetadata و خودِ صفحه هر دو همان کالا را
   می‌خواهند. cache از ری‌اکت باعث می‌شود در طول یک
   درخواست فقط یک بار از سرور پرسیده شود.
   ══════════════════════════════════════════════════ */

const API_URL = process.env.API_URL || 'http://localhost:4000';

/* داده‌ها زنده‌اند: مدیر هر لحظه ممکن است کالایی را
   خاموش یا موجودی را کم کند. نسخهٔ کش‌شده یعنی فروختنِ
   چیزی که نداریم. */
const FETCH_OPTS = { cache: 'no-store' };

/* ── پیامِ خطا، نه صفحهٔ سفید ──
   اگر Express خاموش باشد باید **خطا** بدهیم، نه ۴۰۴:
   «کالا پیدا نشد» دربارهٔ کالایی که شاید هست، هم به
   کاربر دروغ می‌گوید و هم به موتور جست‌وجو. */
function unreachable(err) {
  const e = new Error('ارتباط با سرور برقرار نشد. مطمئن شوید سرور روشن است.');
  e.cause = err;
  return e;
}

/**
 * یک کالای روشن. کالای خاموش و شناسهٔ ناموجود هر دو
 * null برمی‌گردانند — از بیرون فرقی ندارند.
 */
export const getItem = cache(async (kind, slug) => {
  let res;
  try {
    res = await fetch(`${API_URL}/api/items/${kind}/${encodeURIComponent(slug)}`, FETCH_OPTS);
  } catch (err) {
    throw unreachable(err);
  }

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`خطای سرور (${res.status})`);
  return res.json();
});

/** فهرست کالاهای روشن، در صورت نیاز فقط یک نوع */
export const getItems = cache(async (kind = '') => {
  let res;
  try {
    res = await fetch(`${API_URL}/api/items${kind ? `?kind=${kind}` : ''}`, FETCH_OPTS);
  } catch (err) {
    throw unreachable(err);
  }

  if (!res.ok) throw new Error(`خطای سرور (${res.status})`);
  return res.json();
});

/* ── متن‌های سایت ──
   برخلاف کالاها، نبودِ متن‌ها **نباید** صفحه را زمین
   بزند: همان قاعدهٔ ShopContext در نسخهٔ ویت که
   api.content() را با catch(() => ({})) صدا می‌زد. بخش
   متنی رندر نمی‌شود ولی فروشگاه کار می‌کند. */
export const getContent = cache(async () => {
  try {
    const res = await fetch(`${API_URL}/api/content`, FETCH_OPTS);
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
});
