import { describe, it, expect } from 'vitest';
import {
  itemHeadState,
  notFoundHeadState,
  headTags,
  itemTitle,
  itemDescription,
  SITE_NAME,
  SITE_LOCALE
} from '@ghahve/shared/seo.js';
import { toNextMetadata, ogTypeFallback, NEXT_OG_TYPES } from '../web/src/lib/metadata.js';

/* ══════════════════════════════════════════════════
   جانشینِ tests/seo-parity.test.js — تستی که با مورد ۲۶
   حذف شد، چون موضوعش از بین رفت.

   آن تست نگه می‌داشت که دو رندرکنندهٔ <head> — تزریق
   سمت سرور و نویسندهٔ سمت مرورگر — واگرا نشوند. با
   آمدن Next آن دوگانگی از بین رفت: یک رندرکننده بیشتر
   نیست.

   ولی خطرِ زیرینش نرفته، فقط جابه‌جا شده. حالا سؤال این
   است: شیئی که به Next می‌دهیم آیا **همان چیزهایی** را
   می‌گوید که headTags می‌گفت؟ اگر روزی کسی og:image را
   از آداپتور بیندازد، هیچ خطایی رخ نمی‌دهد — فقط
   پیش‌نمایش لینک در تلگرام بی‌تصویر می‌شود. همان
   شکستِ بی‌صدا، در جای تازه.

   پس اینجا خروجی آداپتور تگ‌به‌تگ با headTags سنجیده
   می‌شود: headTags همچنان تعریفِ «چه چیزی باید در
   <head> باشد» است، حتی حالا که خودش رندر نمی‌کند.
   ══════════════════════════════════════════════════ */

const BASE = 'https://daneh.coffee';

/* همان نمونه‌های لبه‌دارِ تستِ همگامیِ قبلی: کالای پر،
   کالای بی‌متن، و کالایی با نویسه‌های خطرناک در نامش. */
const ITEMS = [
  {
    kind: 'coffee',
    slug: 'yirgacheffe',
    name: 'یرگاچف',
    origin: 'اتیوپی · گدئو',
    spec: 'فرآوری شسته · ارتفاع ۲۰۵۰ متر',
    notes: ['یاس', 'لیموترش'],
    taste: 'در فنجان اول عطر یاس می‌زند بیرون.'
  },
  { kind: 'gear', slug: 'v60-02', name: 'قیف وی۶۰', origin: 'سرامیک', spec: '', notes: [] },
  { kind: 'powder', slug: 'matcha', name: 'ماچا', origin: '', spec: '', notes: [] },
  {
    kind: 'coffee',
    slug: 'evil',
    name: 'قهوهٔ <script>alert(1)</script> "خطرناک"',
    origin: 'جایی & جایی',
    spec: '',
    notes: []
  }
];

/* مقدارِ یک تگ، از فهرستی که headTags می‌سازد */
const tagValue = (tags, key) => {
  const t = tags.find(
    (x) => x.attrs.property === key || x.attrs.name === key || x.attrs.rel === key
  );
  return t ? (t.attrs.content ?? t.attrs.href) : undefined;
};

describe('آداپتور metadata — هرچه headTags می‌گفت', () => {
  for (const item of ITEMS) {
    const state = itemHeadState(item, { baseUrl: BASE });
    const tags = headTags(state);
    const meta = toNextMetadata(state);

    it(`«${item.slug}» عنوان و توضیح را می‌رساند`, () => {
      expect(meta.title).toBe(itemTitle(item));
      expect(meta.description).toBe(itemDescription(item));
      expect(meta.description).toBe(tagValue(tags, 'description'));
    });

    it(`«${item.slug}» تگ‌های Open Graph را می‌رساند`, () => {
      expect(meta.openGraph.title).toBe(tagValue(tags, 'og:title'));
      expect(meta.openGraph.description).toBe(tagValue(tags, 'og:description'));
      expect(meta.openGraph.siteName).toBe(tagValue(tags, 'og:site_name'));
      expect(meta.openGraph.locale).toBe(tagValue(tags, 'og:locale'));
      expect(meta.openGraph.url).toBe(tagValue(tags, 'og:url'));
      expect(meta.openGraph.images[0].url).toBe(tagValue(tags, 'og:image'));
      expect(meta.openGraph.images[0].alt).toBe(tagValue(tags, 'og:image:alt'));
    });

    it(`«${item.slug}» کارت توییتر و canonical را می‌رساند`, () => {
      expect(meta.twitter.card).toBe(tagValue(tags, 'twitter:card'));
      expect(meta.twitter.title).toBe(tagValue(tags, 'twitter:title'));
      expect(meta.twitter.description).toBe(tagValue(tags, 'twitter:description'));
      expect(meta.twitter.images[0]).toBe(tagValue(tags, 'twitter:image'));
      expect(meta.alternates.canonical).toBe(tagValue(tags, 'canonical'));
    });

    it(`«${item.slug}» og:type را از راه استثنا می‌رساند`, () => {
      /* ── تنها تگی که از Metadata API نمی‌رود ──
         itemHeadState برای کالا og:type=product می‌گذارد و
         Next این نوع را نمی‌پذیرد؛ اگر بگذاریمش، رندر
         متادیتا خطا می‌دهد و **کل** <head> از دست می‌رود.
         پس صفحه خودش رندرش می‌کند. دلیل کاملش بالای
         web/src/lib/metadata.js آمده.

         این تست همان استثنا را مستند می‌کند: تگ نیفتاده،
         از راه دیگری می‌رود. */
      const type = tagValue(tags, 'og:type');
      expect(type).toBe('product');
      expect(NEXT_OG_TYPES.has(type)).toBe(false);
      expect(meta.openGraph.type).toBeUndefined();
      expect(ogTypeFallback(state)).toBe(type);
    });

    it(`«${item.slug}» چیزی از قلم نینداخته`, () => {
      /* سنجهٔ فراگیر: هر مقداری که headTags می‌ساخت باید
         یا در شیء metadata باشد یا در جبرانِ og:type. اگر
         تگ تازه‌ای به shared اضافه شود و آداپتور به‌روز
         نشود، همین‌جا می‌شکند. */
      const flat = JSON.stringify(meta);
      const fallback = ogTypeFallback(state);

      for (const { attrs } of tags) {
        const value = attrs.content ?? attrs.href;
        if (!value) continue;
        const carried = flat.includes(JSON.stringify(value).slice(1, -1)) || value === fallback;
        expect(carried, `مقدار گم‌شده: ${value}`).toBe(true);
      }
    });
  }
});

describe('og:type هایی که Next می‌پذیرد', () => {
  it('نوع استاندارد از راه معمول می‌رود، نه از راه استثنا', () => {
    /* صفحهٔ اصلی og:type=website دارد و آن را Next
       می‌شناسد؛ استثنا فقط برای product است. */
    const meta = toNextMetadata({ title: 'خانه', ogType: 'website' });
    expect(meta.openGraph.type).toBe('website');
    expect(ogTypeFallback({ ogType: 'website' })).toBe('');
  });
});

describe('آدرسی که کالایی پشتش نیست', () => {
  const state = notFoundHeadState();
  const meta = toNextMetadata(state);

  it('noindex می‌زند ولی لینک‌ها را دنبال‌کردنی می‌گذارد', () => {
    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it('canonical و تصویر و توضیح ندارد', () => {
    expect(meta.alternates).toBeUndefined();
    expect(meta.description).toBeUndefined();
    expect(meta.openGraph?.url).toBeUndefined();
    expect(meta.openGraph?.images).toBeUndefined();
  });

  it('هویت فروشگاه را نگه می‌دارد', () => {
    expect(meta.title).toContain(SITE_NAME);
    expect(meta.openGraph.siteName).toBe(SITE_NAME);
    expect(meta.openGraph.locale).toBe(SITE_LOCALE);
  });

  it('کارت توییترش ساده است، چون تصویری ندارد', () => {
    expect(meta.twitter.card).toBe('summary');
  });
});

describe('صفحه‌ای که تگی ندارد', () => {
  it('شیء خالی، متادیتای خالی می‌دهد — نه undefined', () => {
    const meta = toNextMetadata({});
    expect(meta.title).toBeUndefined();
    expect(meta.openGraph).toBeUndefined();
    /* کارت توییتر همیشه ساخته می‌شود، مثل headTags */
    expect(meta.twitter.card).toBe('summary');
  });
});
