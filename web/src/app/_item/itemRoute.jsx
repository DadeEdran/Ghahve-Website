import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { SEGMENT_KIND, itemHeadState, notFoundHeadState } from '@ghahve/shared/seo.js';
import { getItem, getItems, getContent } from '../../lib/data.js';
import { toNextMetadata, ogTypeFallback } from '../../lib/metadata.js';
import { productSchema, asJsonLd } from '../../lib/seo.js';
import { siteBaseUrl, siteOgImage } from '../../lib/site.js';
import { KINDS } from '../../lib/groups.js';
import { ShopProvider } from '../../context/ShopContext.jsx';
import ItemBody from '../../components/ItemBody.jsx';
import ItemBuyCard from './ItemBuyCard.jsx';
import SiteHeader from '../../components/SiteHeader.jsx';
import { Footer } from '../../components/StaticSections.jsx';

/* ══════════════════════════════════════════════════
   صفحهٔ اختصاصی یک کالا — پیاده‌سازی مشترک.

   ── چرا یک فایل و سه پوشه ──
   در نسخهٔ ویت، مسیرهای /coffee/:slug و همتاهایش با یک
   حلقه روی KIND_SEGMENTS ساخته می‌شدند، پس نوعِ تازه در
   taxonomy خودبه‌خود مسیر هم می‌گرفت. App Router برای هر
   مسیر یک پوشهٔ واقعی می‌خواهد و چنین حلقه‌ای ممکن نیست.

   پس منطق اینجا یک بار نوشته می‌شود و هر پوشه فقط چند
   خط است که آن را با segment خودش صدا می‌زند. آنچه از
   دست رفت — «نوع تازه، مسیرِ خودکار» — با
   tests/next-routes.test.js جبران شده: اگر segmentی
   پوشه نداشته باشد، تست می‌شکند.

   پوشه با _ شروع می‌شود، پس Next آن را مسیر حساب نمی‌کند.

   ── چه چیزی نسبت به نسخهٔ ویت عوض شد ──
   این یک کامپوننت سروری است. متنِ کالا داخل خودِ HTML
   می‌آید، نه اینکه مرورگر بسازدش (مورد ۲۶). تگ‌های
   <head> هم دیگر در زمان اجرا نوشته نمی‌شوند؛
   generateMetadata همان توصیفی را که itemHeadState
   می‌سازد به Next می‌دهد و Next خودش رندرشان می‌کند.
   ══════════════════════════════════════════════════ */

/* ── عنوان، توضیح، canonical و Open Graph ──
   همان itemHeadState ای که sitemap و — تا پیش از این —
   تزریق سمت سرور از آن می‌خواندند. */
export async function itemMetadata(segment, { params }) {
  const { slug } = await params;
  const item = await getItem(SEGMENT_KIND[segment], slug);

  /* ── آدرسی که کالایی پشتش نیست ──
     شناسهٔ ناموجود و کالای خاموش عمداً یکی دیده می‌شوند.
     همان توصیفِ notFoundHeadState که سرور Express هم
     کنار وضعیت ۴۰۴ تزریق می‌کرد: noindex، بدون canonical،
     بدون تصویر. */
  const state = item
    ? itemHeadState(item, { baseUrl: siteBaseUrl(), ogImage: siteOgImage() })
    : notFoundHeadState();

  return toNextMetadata(state);
}

export default async function ItemPage({ segment, params }) {
  const { slug } = await params;
  const kind = SEGMENT_KIND[segment];

  /* getItem با cache پوشانده شده، پس این همان پاسخی است
     که generateMetadata گرفت — یک درخواست، نه دو تا. */
  const item = await getItem(kind, slug);

  /* کالای خاموش یا ناموجود → ۴۰۴ واقعی، با بدنهٔ فارسیِ
     همیشگی. عمداً ۴۱۰ نیست: خاموش کردن یعنی «فعلاً
     فروخته نمی‌شود»، نه «برای همیشه رفت». */
  if (!item) notFound();

  /* ── دانه‌های میکس ──
     دو چیز به آن‌ها نیاز دارد: نامشان در متن «ترکیب این
     میکس»، و قیمتشان که کارت خرید از میانگین وزنی‌شان
     حساب می‌کند. فقط برای میکس‌ها یک درخواست اضافه
     می‌شود؛ کالای معمولی هیچ هزینه‌ای نمی‌دهد. */
  let beanName;
  let beans = [];
  if (item.isBlend && item.components?.length) {
    const all = await getItems('coffee');
    const wanted = new Set(item.components.map((c) => c.slug));
    beans = all.filter((b) => wanted.has(b.slug));
    const bySlug = new Map(all.map((b) => [b.slug, b]));
    beanName = (s) => bySlug.get(s)?.name || s;
  }

  /* متن‌ها فقط برای یک چیز لازم‌اند: فهرست آسیاب‌هایی که
     مدیر تعریف کرده و کارت خرید نشانشان می‌دهد. */
  const content = await getContent();

  /* nonce از همان چیزی می‌آید که proxy.js روی درخواست
     گذاشته. بدون آن، سیاست امنیتی این <script> را هم
     می‌بندد — هرچند داده است و اجرا نمی‌شود. */
  const nonce = (await headers()).get('x-nonce') || undefined;

  /* og:type = product را Metadata API نمی‌پذیرد؛ دلیل
     کاملش بالای lib/metadata.js آمده. همان توصیف را
     دوباره می‌سازیم (تابع خالص است) تا این تگ هم از
     shared بیاید، نه دستی نوشته شود. */
  const ogType = ogTypeFallback(itemHeadState(item, { baseUrl: siteBaseUrl() }));

  return (
    /* ── فهرستِ عمداً ناقص ──
       این صفحه فقط خودِ کالا (و اگر میکس باشد، دانه‌هایش)
       را به Provider می‌دهد، نه صد و شش کالا. پس
       fullCatalogue خاموش است — دلیلش پای همان پارامتر
       در ShopContext نوشته شده و بدون آن، دیدنِ صفحهٔ یک
       قهوه سبد مشتری را پاک می‌کرد. */
    <ShopProvider initialItems={[item, ...beans]} initialContent={content} fullCatalogue={false}>
      {/* تنها تگ <head> ای که از راه Metadata API نمی‌رود.
          ری‌اکت ۱۹ خودش می‌بردش داخل <head>. */}
      {ogType ? <meta property="og:type" content={ogType} /> : null}

      <SiteHeader />

      <main className="item-page">
        <div className="wrap">
          <nav className="crumbs" aria-label="مسیر صفحه">
            <Link href="/">فروشگاه</Link>
            <span aria-hidden="true">›</span>
            <span>{KINDS[item.kind]?.label || 'کالا'}</span>
            <span aria-hidden="true">›</span>
            <span aria-current="page">{item.name}</span>
          </nav>

          <div className="item-page-grid">
            <div className="item-page-card">
              <ItemBuyCard item={item} />
            </div>

            {/* همان متن‌های مودال، ولی به‌عنوان محتوای واقعیِ صفحه
                — چیزی که گوگل می‌خواند و بازدیدکننده می‌بیند یکی است.
                این تکه **سروری** است و از داخل همین درخت به Provider
                پاس داده می‌شود، پس جاوااسکریپتی برایش فرستاده
                نمی‌شود. */}
            <article className="item-page-body">
              <h1>{item.name}</h1>
              <ItemBody item={item} headingLevel="h2" beanName={beanName} />
            </article>
          </div>
        </div>
      </main>

      {/* ── داده‌های ساختاریافته (مورد ۲۸) ──
          تا پیش از این فقط در مرورگر نوشته می‌شد و
          گوگل باید جاوااسکریپت را اجرا می‌کرد تا ببیندش.
          حالا داخل خودِ پاسخ است.

          رشته پیش از این با jsonLdText بی‌خطر شده (هر
          < و > و & به escape یونیکد تبدیل شده)، پس
          نامِ کالایی مثل `</script><script>` نمی‌تواند
          از اینجا بیرون بزند. */}
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: asJsonLd(productSchema(item)) }}
      />

      <Footer />
    </ShopProvider>
  );
}
