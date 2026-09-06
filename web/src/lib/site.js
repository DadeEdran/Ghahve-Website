import { normalizeBaseUrl, DEFAULT_OG_IMAGE } from '@ghahve/shared/seo.js';

/* ══════════════════════════════════════════════════
   آدرس پایه و تصویر پیش‌نمایش — از محیط.

   Next فقط چیزهایی را به مرورگر می‌دهد که با
   NEXT_PUBLIC_ شروع شوند، پس نام متغیرها همین پیشوند را
   دارند. منطقش ساده است و عوض نشده: «اگر تنظیم نشده بود،
   آدرس نسبی بهتر از آدرس غلط است».

   یک نکتهٔ مهم: این تابع **روی سرور** هم صدا زده می‌شود،
   جایی که window وجود ندارد. پس در نبود متغیر محیطی،
   به‌جای حدس زدن، رشتهٔ خالی برمی‌گردد و Next مسیر نسبی
   می‌سازد.
   ══════════════════════════════════════════════════ */

export function siteBaseUrl(env = process.env) {
  const fromEnv = normalizeBaseUrl(env.NEXT_PUBLIC_SITE_URL);
  if (fromEnv) return fromEnv;
  return typeof window === 'undefined' ? '' : window.location.origin;
}

export function siteOgImage(env = process.env) {
  return env.NEXT_PUBLIC_OG_IMAGE || DEFAULT_OG_IMAGE;
}

/* metadataBase در Next باید یک URL کامل باشد وگرنه
   آدرس‌های نسبیِ og:image را نمی‌تواند مطلق کند و هشدار
   می‌دهد. در توسعه که SITE_URL تنظیم نیست، خودِ همین
   سرور را می‌گذاریم. */
export function metadataBase(env = process.env) {
  const base = siteBaseUrl(env) || `http://localhost:${env.PORT || 3000}`;
  try {
    return new URL(base);
  } catch {
    return undefined;
  }
}
