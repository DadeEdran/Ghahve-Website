import { itemHeadState } from '@ghahve/shared/seo.js';
import { siteBaseUrl } from './site.js';

/* ══════════════════════════════════════════════════
   هم‌رسانی یک کالا.

   ── چرا آدرس از itemHeadState می‌آید ──
   لینکی که مشتری برای دوستش می‌فرستد باید **دقیقاً**
   همان آدرسی باشد که در canonical و og:url صفحه نوشته
   شده؛ وگرنه پیش‌نمایشِ تلگرام و واتساپ به یک آدرس نگاه
   می‌کند و لینک به آدرسی دیگر می‌رود. پس اینجا هیچ
   رشته‌ای دستی ساخته نمی‌شود: همان توصیفِ صفحه ساخته
   می‌شود و canonicalش برداشته می‌شود — همان چیزی که
   lib/metadata.js به Next می‌دهد. (قاعدهٔ ۴: یک منبع.)

   ── دو راه، و اینکه کدام کِی ──
   • موبایل: navigator.share برگهٔ خودِ سیستم را باز
     می‌کند — تلگرام، واتساپ، پیامک، هرچه نصب است.
   • دسکتاپ: لینک در کلیپ‌بورد کپی می‌شود و یک توست فارسی
     می‌گوید چه شد. کسی که بلد نیست آدرس را از نوار
     مرورگر بردارد، همان چیزی را می‌گیرد که می‌خواست.

   ── چرا «هست یا نه» ملاک نیست ──
   یک روز شرطِ این دوراهی فقط `typeof nav.share === 'function'`
   بود، با این فرض که «تقریباً هیچ مرورگر دسکتاپی share
   ندارد». آن فرض دیگر درست نیست: کروم روی ویندوز هم
   navigator.share دارد، ولی چیزی که باز می‌کند برگهٔ
   خالیِ خودِ ویندوز است که بی‌کار بسته می‌شود — و در آن
   مسیر هیچ‌وقت کاری به کلیپ‌بورد نمی‌رسد. یعنی کاربر
   دسکتاپ دکمه را می‌زد، پنلی می‌آمد و می‌رفت، و لینک
   هیچ‌جا کپی نشده بود.

   پس ملاک از «مرورگر share دارد؟» عوض شد به «دستگاه
   واقعاً لمسی است؟». آنجا برگهٔ سیستم واقعاً خوب است و
   می‌ماند؛ همه‌جای دیگر مستقیم می‌رویم سراغ کپی.

   ── چرا همه‌چیز تزریق‌پذیر است ──
   navigator و document پارامترند تا این منطق بدون
   مرورگر تست شود (قاعدهٔ ۹). در عمل هیچ‌کس آن‌ها را
   نمی‌دهد و پیش‌فرض‌ها کار می‌کنند.
   ══════════════════════════════════════════════════ */

/* پیام‌هایی که مشتری می‌بیند. یک‌جا، تا تست و کامپوننت
   هر دو از همین بخوانند. */
export const SHARE_COPIED = 'لینک این کالا کپی شد — حالا می‌توانید بفرستیدش';
export const SHARE_FAILED = 'کپی نشد — نشانی این صفحه را از نوار مرورگر بردارید';

/**
 * نشانی متعارف کالا — همان canonical صفحه‌اش.
 *
 * @param item کالا، همان‌طور که از /api/items می‌آید
 * @param env  محیط (برای تست؛ پیش‌فرض process.env)
 */
export function itemShareUrl(item, env) {
  return itemHeadState(item, { baseUrl: siteBaseUrl(env) }).canonical;
}

/**
 * دستگاه لمسی است؟ — یعنی برگهٔ سیستم آنجا ارزش دارد.
 *
 * ملاک اصلی `(pointer: coarse)` است: یعنی **نشانگر اصلیِ**
 * دستگاه انگشت است، نه ماوس. لپ‌تاپِ لمسی که ماوس هم دارد
 * `fine` گزارش می‌دهد و درست هم همین است — آنجا کپی به کار
 * کاربر می‌آید، نه برگهٔ سیستم.
 *
 * maxTouchPoints فقط تکیه‌گاهِ آخر است، برای مرورگرِ بی
 * matchMedia. به‌تنهایی ملاک بدی است: هر نمایشگر لمسیِ
 * وصل به دسکتاپ آن را بالای صفر می‌کند.
 */
export function isTouchDevice(opts = {}) {
  const { nav = globalThis.navigator, win = globalThis } = opts;

  const mq = win?.matchMedia?.('(pointer: coarse)');
  if (typeof mq?.matches === 'boolean') return mq.matches;

  return Number(nav?.maxTouchPoints) > 0;
}

/* ── کپی، با یک راه دوم ──
   navigator.clipboard فقط در «زمینهٔ امن» (https یا
   localhost) هست. فروشگاهی که روی http ساده بالا آمده
   باشد اصلاً چنین چیزی ندارد، و آنجا همان ترفند قدیمی —
   textarea موقت و execCommand — تنها راهی است که کار
   می‌کند. منسوخ است، ولی جایگزینِ کار‌کننده‌ای ندارد و
   بی‌خطر است: اگر هم نبود، فقط false برمی‌گرداند. */
export async function copyText(text, opts = {}) {
  const { nav = globalThis.navigator, doc = globalThis.document } = opts;

  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(text);
      return true;
    } catch {
      /* رد شدن اجازه یا زمینهٔ ناامن — راه دوم را امتحان کن */
    }
  }

  if (!doc?.body || typeof doc.execCommand !== 'function') return false;

  try {
    const box = doc.createElement('textarea');
    box.value = text;
    /* خارج از دید، ولی نه display:none — انتخاب‌شدنی بماند */
    box.setAttribute('readonly', '');
    box.style.position = 'fixed';
    box.style.insetBlockStart = '-1000px';
    box.style.opacity = '0';
    doc.body.appendChild(box);
    box.select();
    const ok = doc.execCommand('copy');
    doc.body.removeChild(box);
    return Boolean(ok);
  } catch {
    return false;
  }
}

/**
 * یک بار تلاش برای هم‌رسانی کالا.
 *
 * برمی‌گرداند: { mode, url }
 *   'shared'   برگهٔ سیستم باز شد و کاربر فرستاد — توست لازم نیست
 *   'canceled' کاربر برگه را بست — هیچ اتفاقی نیفتاده، ساکت بمان
 *   'copied'   لینک در کلیپ‌بورد است — توست تأیید
 *   'failed'   هیچ‌کدام نشد — توست راهنمایی
 */
export async function shareItem(item, opts = {}) {
  const { nav = globalThis.navigator, doc = globalThis.document, win = globalThis, env } = opts;
  const url = opts.url || itemShareUrl(item, env);
  const title = String(item?.name || '');

  /* روی دسکتاپ حتی اگر share باشد سراغش نمی‌رویم — بالاتر
     نوشته چرا. آنجا یک‌راست کپی، که هم کار می‌کند و هم
     توست تأییدش را می‌دهد. */
  if (typeof nav?.share === 'function' && isTouchDevice({ nav, win })) {
    try {
      await nav.share({ title, url });
      return { mode: 'shared', url };
    } catch (err) {
      /* بستنِ برگه خطا نیست — کاربر نظرش عوض شده. هر
         خطای دیگری یعنی share از کار افتاده، پس همان
         راه کپی را می‌رویم تا دست مشتری خالی نماند. */
      if (err?.name === 'AbortError') return { mode: 'canceled', url };
    }
  }

  return { mode: (await copyText(url, { nav, doc })) ? 'copied' : 'failed', url };
}
