'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { productArt, gearArt, powderArt } from '../lib/art.js';
import { isOptimizable } from '../lib/img.js';

/* ══════════════════════════════════════════════════
   تصویر کارت.
   اگر مدیر عکس واقعی آپلود کرده باشد همان نشان داده
   می‌شود؛ وگرنه طرح خودکار همیشگی کشیده می‌شود.

   ── چرا next/image (نیمهٔ دوم مورد ۲۴) ──
   عکس آپلودی تا چهار مگابایت خام سرو می‌شد، در قابی که
   بزرگ‌ترینش ۳۸۵ پیکسل عرض دارد و کوچک‌ترینش ۶۲. یعنی
   مشتری موبایل عکسی را می‌گرفت که هیچ‌وقت بیش از یک
   بیستمش را نمی‌دید. حالا همان فایل از /_next/image رد
   می‌شود: به اندازهٔ همان قاب کوچک می‌شود، به AVIF یا
   WebP تبدیل می‌شود اگر مرورگر بگوید می‌فهمد، و روی
   دیسک کش می‌شود تا دفعهٔ بعد فقط از کش خوانده شود.

   طرح تولیدی SVG از این راه نمی‌رود و همان است که بود —
   دلیلش بالای lib/img.js نوشته شده.
   ══════════════════════════════════════════════════ */

export function artSVG(item) {
  if (!item) return '';
  try {
    if (item.kind === 'gear') return gearArt(item);
    if (item.kind === 'powder') return powderArt(item);
    return productArt(item);
  } catch {
    return ''; // طرح ناقص نباید کل صفحه را از کار بیندازد
  }
}

/* ══════════════════════════════════════════════════
   جایگاه‌ها.

   یک کلاس (.card-art) در پنج قاب با پنج اندازهٔ خیلی
   متفاوت استفاده می‌شود، پس خودِ کلاس نمی‌تواند به
   مرورگر بگوید کدام نسخه را بردارد. فراخوان جایگاهش را
   نام می‌برد و اندازه‌ها از اینجا می‌آیند.

   • w/h فقط نسبت ابعاد را به مرورگر می‌دهند تا پیش از
     رسیدن عکس جای درست را نگه دارد؛ اندازهٔ واقعی را
     همچنان CSS تعیین می‌کند (هر دو بُعد را هم می‌دهد،
     پس next/image هشدار «یک بُعد عوض شده» نمی‌دهد).
   • sizes همان چیدمانِ style.css را به زبان مرورگر
     می‌گوید. عددهای درصدی مهم‌اند: Next از کوچک‌ترینِ
     آن‌ها تصمیم می‌گیرد کوچک‌ترین نسخهٔ srcset چقدر باشد.
     با ۳۰vw، نسخه‌های ۲۵۶ و ۳۸۴ و ۴۴۸ پیکسلی هم ساخته
     می‌شوند — همان‌هایی که یک کارت واقعاً لازم دارد.
   ══════════════════════════════════════════════════ */
const SLOTS = {
  /* کارت فهرست. شبکه‌اش auto-fill با ستون کمینهٔ ۲۸۵px و
     شکاف ۲۲px است، داخل .wrap که min(1200px, 92%) عرض
     دارد. یعنی تعداد ستون‌ها پله‌ای عوض می‌شود و عرض
     کارت با عرض پنجره خطی بالا نمی‌رود:

       ≥ ۱۳۰۵px → سه ستون، هر کدام ۳۸۵px ثابت
       ۹۷۵–۱۳۰۵ → سه ستون، حدود ۳۰vw
       ۶۴۵–۹۷۵  → دو ستون، حدود ۴۵vw
       < ۶۴۵    → یک ستون، ۹۲vw

     همین پله‌ها را به مرورگر می‌گوییم. */
  card: {
    w: 385,
    h: 152,
    sizes: '(min-width: 1305px) 385px, (min-width: 975px) 30vw, (min-width: 645px) 45vw, 92vw'
  },
  /* سرصفحهٔ صفحهٔ کالا و مودالش — .sheet-art */
  sheet: { w: 120, h: 96, sizes: '120px' },
  /* کارت میکس — .blend-art */
  blend: { w: 78, h: 64, sizes: '78px' },
  /* بندانگشتیِ سبد و فهرست پنل — .cart-thumb و .admin-thumb */
  thumb: { w: 70, h: 52, sizes: '70px' }
};

export default function CardArt({ item, className = 'card-art', slot = 'card', priority = false }) {
  const svg = useMemo(() => (item?.image ? '' : artSVG(item)), [item]);

  if (item?.image) {
    const box = SLOTS[slot] || SLOTS.card;

    /* عکس برداری یا آدرس بیرونی: خام، همان‌طور که بود.
       بهینه‌ساز هر دو را رد می‌کند و نتیجه‌اش قابِ خالی
       بود، نه عکسِ بهینه‌نشده. */
    if (!isOptimizable(item.image)) {
      return <img className={className} src={item.image} alt={item.name} loading="lazy" />;
    }

    return (
      <Image
        className={className}
        src={item.image}
        alt={item.name}
        width={box.w}
        height={box.h}
        sizes={box.sizes}
        /* پیش‌فرضِ next/image خودش lazy است؛ priority فقط
           جایی که تصویر بالای صفحه است (سرصفحهٔ کالا). */
        priority={priority}
      />
    );
  }

  return <span className="art-holder" dangerouslySetInnerHTML={{ __html: svg }} />;
}
