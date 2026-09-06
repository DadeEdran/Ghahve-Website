import { headers } from 'next/headers';
import { HOME_TITLE, HOME_DESCRIPTION, SITE_NAME, SITE_LOCALE } from '@ghahve/shared/seo.js';
import { getItems, getContent } from '../lib/data.js';
import { toNextMetadata } from '../lib/metadata.js';
import { organizationSchema, asJsonLd, canonicalUrl } from '../lib/seo.js';
import { siteOgImage } from '../lib/site.js';
import { ShopProvider } from '../context/ShopContext.jsx';
import HomeShell from '../components/HomeShell.jsx';

/* ══════════════════════════════════════════════════
   صفحهٔ اصلی.

   ── چه چیزی اینجا عوض شد ──
   در نسخهٔ ویت، مرورگر یک HTML خالی می‌گرفت، بعد
   جاوااسکریپت را دانلود و اجرا می‌کرد، بعد ShopContext
   دو درخواست به /api/items و /api/content می‌فرستاد، و
   بعد اولین قهوه دیده می‌شد.

   حالا هر دو درخواست **اینجا** و روی سرور انجام می‌شوند
   و نتیجه‌شان به‌شکل پارامتر به ShopProvider می‌رسد. یعنی
   پاسخِ اول، خودش فهرست کالاها را دارد.

   داده به‌شکل prop از مرز سروری به مشتری رد می‌شود؛ همان
   چیزی که تا امروز با fetch در مرورگر گرفته می‌شد.
   ══════════════════════════════════════════════════ */

export async function generateMetadata() {
  /* عنوان و توضیح در layout هم هستند (پیش‌فرض همهٔ
     صفحه‌ها)، ولی canonical و og:url مالِ همین مسیرند و
     نباید در layout بنشینند — آن‌وقت آدرس صفحهٔ اصلی روی
     همهٔ صفحه‌ها تکرار می‌شد. */
  return toNextMetadata({
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    canonical: canonicalUrl('/'),
    ogType: 'website',
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    image: canonicalUrl(siteOgImage()),
    imageAlt: SITE_NAME
  });
}

export default async function HomePage() {
  /* هر دو با هم، نه یکی پس از دیگری */
  const [items, content] = await Promise.all([getItems(), getContent()]);

  const nonce = (await headers()).get('x-nonce') || undefined;

  /* ── LocalBusiness ──
     از بخش «دربارهٔ ما»ی پنل مدیریت ساخته می‌شود. اگر مدیر
     هنوز چیزی ننوشته، اصلاً منتشر نمی‌شود — نشانیِ خالی در
     دادهٔ ساختاریافته از نبودش بدتر است.

     در نسخهٔ ویت این تا آمدن متن‌ها در مرورگر صبر می‌کرد؛
     حالا در همان پاسخ اول هست. */
  const orgJsonLd = content?.about ? asJsonLd(organizationSchema(content)) : '';

  return (
    <ShopProvider initialItems={items} initialContent={content}>
      <HomeShell />

      {orgJsonLd ? (
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: orgJsonLd }}
        />
      ) : null}
    </ShopProvider>
  );
}
