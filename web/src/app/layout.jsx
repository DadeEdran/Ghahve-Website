import {
  SITE_LANG,
  SITE_DIR,
  SITE_NAME,
  SITE_LOCALE,
  HOME_TITLE,
  HOME_DESCRIPTION
} from '@ghahve/shared/seo.js';
import { vazirmatn, lalezar } from './fonts.js';
import Toast from '../components/Toast.jsx';
import { metadataBase, siteOgImage } from '../lib/site.js';
import '../style.css';
import '../admin.css';

/* ══════════════════════════════════════════════════
   پوستهٔ همهٔ صفحه‌ها.

   جای فایل index.html و نقطهٔ ورودِ نسخهٔ پیشین را
   می‌گیرد، ولی یک تفاوت بنیادی دارد: آنجا تگ‌های <head>
   واقعاً **کفِ کار** بودند — چیزی برای رباتی که
   جاوااسکریپت اجرا نمی‌کند — و هر صفحه باید در زمان اجرا
   نسخهٔ خودش را رویشان می‌نوشت. برای همین یک مدیرِ head
   با پشتهٔ سه‌حالته لازم بود: پیش‌فرض ثابت، تزریق‌شدهٔ
   سرور، و نوشتهٔ مرورگر.

   اینجا چنین چیزی لازم نیست. metadata زیر واقعاً
   پیش‌فرض است: هر مسیری که generateMetadata خودش را
   داشته باشد جایش را می‌گیرد، و Next تضمین می‌کند تگ
   دوباره ساخته نشود. آن پشته و صفت‌های نشان‌گذارش همه
   حذف شدند.

   متن‌ها همچنان از shared/seo.js می‌آیند — همان‌جایی که
   sitemap و صفحهٔ کالا هم از آن می‌خوانند.
   ══════════════════════════════════════════════════ */

export const metadata = {
  metadataBase: metadataBase(),
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  icons: { icon: [{ url: '/img/favicon.svg', type: 'image/svg+xml' }] },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [siteOgImage()]
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [siteOgImage()]
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1
};

/* ══════════════════════════════════════════════════
   چرا همهٔ صفحه‌ها پویا رندر می‌شوند.

   سیاست امنیتی ما (web/src/proxy.js) به‌جای
   'unsafe-inline' از nonce استفاده می‌کند، و nonce
   **برای هر درخواست تازه ساخته می‌شود**. صفحه‌ای که
   موقع build از پیش ساخته و کش شده باشد، nonce آن
   درخواست را ندارد — یعنی اسکریپت‌های Next بی‌nonce
   می‌مانند و مرورگر همه‌شان را می‌بندد. صفحه رندر
   می‌شود ولی هیچ‌وقت زنده نمی‌شود.

   پس یکی از این دو را می‌شد داشت، نه هر دو: کشِ ایستا،
   یا سیاست سخت‌گیرانه. سیاست را نگه داشتیم.

   هزینه‌اش کمتر از چیزی است که به‌نظر می‌رسد: تقریباً
   هیچ صفحهٔ این فروشگاه واقعاً ایستا نیست — فهرست
   کالاها، موجودی و متن‌های سایت همه از پایگاه داده
   می‌آیند و مدیر هر روز عوضشان می‌کند. نسخهٔ ویت هم
   هر بار همین داده‌ها را از سرور می‌گرفت؛ فرق اینجاست
   که حالا یک رفت‌وبرگشت انجام می‌شود نه دو تا.
   ══════════════════════════════════════════════════ */
export const dynamic = 'force-dynamic';

export default function RootLayout({ children, modal }) {
  /* زبان و جهت از shared می‌آیند، نه ثابتِ نوشته‌شده —
     همان مقادیری که notFoundHeadState و بقیه استفاده
     می‌کنند. کلاس‌های فونت روی <html> می‌نشینند تا
     متغیرهای --font-* در کل سند در دسترس باشند.

     ── شکاف دومِ صفحه: مودال کالا ──
     `modal` یک «مسیر موازی» است (app/@modal). در حال
     عادی خالی است؛ وقتی کاربر از داخل سایت روی کارتی
     کلیک می‌کند، مسیرِ رهگیری‌شده آن را پر می‌کند و
     صفحهٔ زیر — که همان `children` است — دست‌نخورده سر
     جایش می‌ماند. جانشینِ backgroundLocation نسخهٔ ویت،
     و دلیلش پای app/_item/ItemModal.jsx آمده. */
  return (
    <html lang={SITE_LANG} dir={SITE_DIR} className={`${vazirmatn.variable} ${lalezar.variable}`}>
      <body>
        {children}
        {modal}

        {/* ── یک توست، برای هر دو شکاف ──
            پیام‌های کوتاه («به سبد اضافه شد»، «لینک کپی
            شد») از یک انبارهٔ ماژولی می‌آیند، نه از
            کانتکست. پس اینجا — بالای هر دو شکاف — یک بار
            رندر می‌شود و هم صفحه، هم مودالِ رهگیری‌شده
            می‌توانند پیام بدهند. دلیلش پای
            lib/toastStore.js نوشته شده. */}
        <Toast />
      </body>
    </html>
  );
}
