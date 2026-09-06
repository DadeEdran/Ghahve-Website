import Link from 'next/link';
import { notFoundHeadState } from '@ghahve/shared/seo.js';
import { toNextMetadata } from '../../lib/metadata.js';

/* ══════════════════════════════════════════════════
   «این کالا پیدا نشد» — همان متن و همان طرحِ نسخهٔ ویت.

   دو حالت به اینجا می‌رسند و عمداً یکی دیده می‌شوند:
   شناسه‌ای که هیچ‌وقت نبوده، و کالایی که مدیر خاموشش
   کرده. از بیرون فرقی ندارند.

   ── چرا metadata اینجا هم هست، با اینکه صفحهٔ کالا
   خودش generateMetadata دارد ──
   وقتی notFound() صدا زده می‌شود، Next نتیجهٔ
   generateMetadata همان مسیر را **دور می‌ریزد** و به
   metadata لایهٔ بالاتر برمی‌گردد. یعنی بدون این بلوک،
   صفحهٔ ۴۰۴ عنوان و توضیح و og:image صفحهٔ اصلی را
   می‌گرفت: پیش‌نمایشی تبلیغاتی برای لینکی که به بن‌بست
   می‌رسد — دقیقاً همان چیزی که notFoundHeadState عمداً
   کنار گذاشته بود.

   پس همان توصیف، این بار از این طرف اعلام می‌شود.
   description و alternates صریحاً null اند: در Next
   کلیدی که ننویسی از والد به ارث می‌رسد، و «ننوشتن»
   با «نداشتن» یکی نیست.
   ══════════════════════════════════════════════════ */

export const metadata = {
  ...toNextMetadata(notFoundHeadState()),
  /* ارث را می‌بُرند؛ صفحه‌ای که وجود ندارد نه توصیفی
     دارد و نه نسخهٔ متعارفی. */
  description: null,
  alternates: null
};

export default function ItemNotFound() {
  return (
    <main className="item-page">
      <div className="wrap">
        <div className="load-error" role="alert">
          <h1>این کالا پیدا نشد</h1>
          <p>
            شاید از فهرست برداشته شده باشد یا آدرس را ناقص کپی کرده باشید. از میز قهوه‌ها دوباره
            پیدایش کنید.
          </p>
          <Link className="btn btn-primary" href="/">
            بازگشت به فروشگاه
          </Link>
        </div>
      </div>
    </main>
  );
}
