import { describe, it, expect } from 'vitest';
import {
  productJsonLd,
  organizationJsonLd,
  jsonLdText,
  toRial,
  CURRENCY,
  AVAILABILITY,
  itemTitle,
  itemDescription,
  clamp,
  SITE_NAME
} from '@ghahve/shared/seo.js';
import { productSchema, organizationSchema, parseOpeningHours } from '../web/src/lib/seo.js';

/* ══════════════════════════════════════════════════
   مورد ۲۸ — داده‌های ساختاریافته.

   سه چیز سنجیده می‌شود: شکل خروجی (هر چیزی که گوگل
   اجباری می‌داند سر جایش باشد)، ساخته‌شدنش از دادهٔ
   واقعی کالا (نه متن ثابت)، و بی‌خطر بودنِ متنی که مدیر
   وارد کرده وقتی داخل <script> می‌نشیند.
   ══════════════════════════════════════════════════ */

const BASE = 'https://daneh.coffee';

const coffee = {
  kind: 'coffee',
  slug: 'yirgacheffe',
  name: 'یرگاچف',
  origin: 'اتیوپی · گدئو',
  spec: 'فرآوری شسته · ارتفاع ۲۰۵۰ متر',
  group: 'light',
  price: 1850000,
  notes: ['یاس', 'لیموترش', 'شکر قهوه‌ای'],
  taste: 'در فنجان اول عطر یاس می‌زند بیرون، بعد ترشی روشن لیمو می‌آید.'
};

const gear = {
  kind: 'gear',
  slug: 'hario-v60',
  name: 'قیف هاریو وی۶۰',
  origin: 'سرامیک',
  spec: 'اندازهٔ ۰۲',
  group: 'pourover',
  price: 980000,
  notes: []
};

describe('productJsonLd — شکل خروجی', () => {
  const schema = productJsonLd(coffee, {
    baseUrl: BASE,
    brandName: SITE_NAME,
    description: 'توضیح',
    image: '/img/og-default.png',
    category: 'رست روشن',
    weighed: true,
    soldOut: false
  });

  it('کلیدهای اجباری schema.org سر جایشان‌اند', () => {
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('Product');
    expect(schema.name).toBe('یرگاچف');
    expect(schema.description).toBe('توضیح');
    expect(schema.sku).toBe('yirgacheffe');
    expect(schema.url).toBe(`${BASE}/coffee/yirgacheffe`);
  });

  it('brand یک گرهٔ Brand است، نه رشته', () => {
    expect(schema.brand).toEqual({ '@type': 'Brand', name: SITE_NAME });
  });

  it('image آرایه‌ای از آدرس مطلق است', () => {
    expect(schema.image).toEqual([`${BASE}/img/og-default.png`]);
  });

  it('offers قیمت و واحد پول و موجودی دارد', () => {
    expect(schema.offers['@type']).toBe('Offer');
    expect(schema.offers.priceCurrency).toBe('IRR');
    expect(schema.offers.availability).toBe(AVAILABILITY.inStock);
    expect(schema.offers.url).toBe(schema.url);
  });

  it('قیمت رشته است، نه عدد — الزام گوگل', () => {
    expect(typeof schema.offers.price).toBe('string');
  });

  it('کل خروجی JSON معتبر است و رفت‌وبرگشت می‌کند', () => {
    expect(JSON.parse(JSON.stringify(schema))).toEqual(schema);
  });

  it('هیچ کلیدی با مقدار خالی نمی‌ماند', () => {
    const walk = (o) => {
      for (const [k, v] of Object.entries(o)) {
        expect(v, `کلید ${k}`).not.toBe('');
        expect(v, `کلید ${k}`).not.toBeNull();
        expect(v, `کلید ${k}`).not.toBeUndefined();
        if (v && typeof v === 'object' && !Array.isArray(v)) walk(v);
      }
    };
    walk(schema);
  });
});

describe('قیمت — تومانِ پایگاه داده به ریالِ ISO', () => {
  it('واحد پول کد رسمی ISO است', () => {
    expect(CURRENCY).toBe('IRR');
  });

  it('هر تومان ده ریال است', () => {
    expect(toRial(1850000)).toBe(18500000);
    expect(toRial(0)).toBe(0);
    expect(toRial(undefined)).toBe(0);
  });

  it('قیمت کالای وزنی «هر کیلو» اعلام می‌شود', () => {
    const s = productJsonLd(coffee, { baseUrl: BASE, weighed: true });
    const spec = s.offers.priceSpecification;
    expect(spec['@type']).toBe('UnitPriceSpecification');
    expect(spec.referenceQuantity).toEqual({
      '@type': 'QuantitativeValue',
      value: 1,
      unitCode: 'KGM'
    });
    expect(spec.price).toBe('18500000');
  });

  it('کالای عددی priceSpecification ندارد', () => {
    const s = productJsonLd(gear, { baseUrl: BASE, weighed: false });
    expect(s.offers.priceSpecification).toBeUndefined();
    expect(s.offers.price).toBe('9800000');
  });
});

describe('موجودی از وضعیت واقعی انبار می‌آید', () => {
  /* stock === null یعنی نامحدود (پیش‌فرض مدل)، صفر یعنی
     تمام شد، و کمتر از کمینهٔ خرید هم یعنی تمام شد. */
  const withStock = (stock) => ({ ...coffee, stock });

  it('موجودی نامحدود → InStock', () => {
    expect(productSchema(withStock(null), { baseUrl: BASE }).offers.availability).toBe(
      AVAILABILITY.inStock
    );
  });

  it('کالای بی‌فیلد موجودی هم InStock', () => {
    expect(productSchema(coffee, { baseUrl: BASE }).offers.availability).toBe(AVAILABILITY.inStock);
  });

  it('موجودی صفر → OutOfStock', () => {
    expect(productSchema(withStock(0), { baseUrl: BASE }).offers.availability).toBe(
      AVAILABILITY.outOfStock
    );
  });

  it('موجودی کمتر از کمینهٔ خرید (۱۰۰ گرم قهوه) → OutOfStock', () => {
    expect(productSchema(withStock(50), { baseUrl: BASE }).offers.availability).toBe(
      AVAILABILITY.outOfStock
    );
  });

  it('موجودی برابر کمینهٔ خرید → InStock', () => {
    expect(productSchema(withStock(100), { baseUrl: BASE }).offers.availability).toBe(
      AVAILABILITY.inStock
    );
  });

  it('ابزارِ یکی‌مانده هنوز InStock است', () => {
    expect(productSchema({ ...gear, stock: 1 }, { baseUrl: BASE }).offers.availability).toBe(
      AVAILABILITY.inStock
    );
  });
});

describe('productSchema — ساخته‌شدن از دادهٔ واقعی کالا', () => {
  const s = productSchema(coffee, { baseUrl: BASE });

  it('نام و شناسه از خودِ کالا می‌آیند', () => {
    expect(s.name).toBe(coffee.name);
    expect(s.sku).toBe(coffee.slug);
  });

  it('توضیح از فیلدهای کالا ساخته می‌شود، نه متن ثابت', () => {
    expect(s.description).toContain('اتیوپی');
    expect(s.description).toContain('یاس');
  });

  it('دسته برچسب فارسی همان گروه است', () => {
    expect(s.category).toBe('رست روشن');
  });

  it('قیمت همان قیمت کالاست', () => {
    expect(s.offers.price).toBe(String(toRial(coffee.price)));
  });

  it('کالای ابزار برچسب دستهٔ خودش را می‌گیرد', () => {
    expect(productSchema(gear, { baseUrl: BASE }).category).toBe('دم‌آور دستی');
  });
});

describe('jsonLdText — بی‌خطر شدن متن مدیر', () => {
  it('هیچ < یا > خامی در خروجی نمی‌ماند', () => {
    const evil = { name: '</script><script>alert(1)</script>' };
    const out = jsonLdText(evil);
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
    expect(out).toContain('\\u003c');
  });

  it('& هم بسته می‌شود', () => {
    expect(jsonLdText({ a: 'x&y' })).not.toContain('&');
  });

  it('بعد از escape هنوز JSON معتبری است با همان مقدار', () => {
    const evil = { name: '</script>' };
    expect(JSON.parse(jsonLdText(evil))).toEqual(evil);
  });

  it('جداکنندهٔ خط یونیکد (U+2028) هم escape می‌شود', () => {
    const s = jsonLdText({ a: `x${String.fromCharCode(0x2028)}y` });
    expect(s).not.toContain(String.fromCharCode(0x2028));
    expect(JSON.parse(s).a).toBe(`x${String.fromCharCode(0x2028)}y`);
  });

  it('نام مخرب کالا از مسیر واقعی هم بی‌خطر بیرون می‌آید', () => {
    const out = jsonLdText(
      productSchema({ ...coffee, name: '</script><img src=x onerror=alert(1)>' }, { baseUrl: BASE })
    );
    expect(out).not.toContain('<');
    expect(out).not.toContain('onerror=alert(1)>');
  });
});

describe('organizationJsonLd / organizationSchema', () => {
  const content = {
    about: {
      lead: 'رُست‌خانهٔ دانه از یک درام پنج کیلویی در زیرزمین کریم‌خان شروع شد.',
      image: '/img/roastery.svg',
      address: 'تهران، خیابان کریم‌خان، کوچهٔ نیلوفر، پلاک ۱۲',
      hours: 'شنبه تا چهارشنبه ۱۰ تا ۲۰ · پنجشنبه ۱۰ تا ۱۶',
      phone: '۰۲۱-۸۸۰۰۰۰۰۰',
      email: 'hello@daneh.coffee'
    }
  };

  const s = organizationSchema(content, { baseUrl: BASE });

  it('LocalBusiness است — که خودش Organization هم هست', () => {
    expect(s['@type']).toBe('LocalBusiness');
    expect(s['@context']).toBe('https://schema.org');
  });

  it('نشانی یک گرهٔ PostalAddress با کشور ایران است', () => {
    expect(s.address['@type']).toBe('PostalAddress');
    expect(s.address.streetAddress).toBe(content.about.address);
    expect(s.address.addressLocality).toBe('تهران');
    expect(s.address.addressCountry).toBe('IR');
  });

  it('تلفن با رقم لاتین می‌آید تا قابل شماره‌گیری باشد', () => {
    expect(s.telephone).toBe('021-88000000');
  });

  it('ایمیل و آدرس سایت از داده می‌آیند', () => {
    expect(s.email).toBe('hello@daneh.coffee');
    expect(s.url).toBe(`${BASE}/`);
  });

  it('تصویر و لوگو مطلق می‌شوند', () => {
    expect(s.image).toBe(`${BASE}/img/roastery.svg`);
    expect(s.logo).toBe(`${BASE}/img/favicon.svg`);
  });

  it('JSON معتبر است', () => {
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  it('بدون نشانی، کلید address اصلاً ساخته نمی‌شود', () => {
    const empty = organizationJsonLd({ baseUrl: BASE, name: SITE_NAME });
    expect(empty.address).toBeUndefined();
    expect(empty.openingHoursSpecification).toBeUndefined();
  });
});

describe('parseOpeningHours — جملهٔ فارسی به ساعت ماشین‌خوان', () => {
  it('بازهٔ روزها باز می‌شود و هفته از شنبه شروع می‌شود', () => {
    const [first, second] = parseOpeningHours('شنبه تا چهارشنبه ۱۰ تا ۲۰ · پنجشنبه ۱۰ تا ۱۶');

    expect(first).toEqual({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [
        'https://schema.org/Saturday',
        'https://schema.org/Sunday',
        'https://schema.org/Monday',
        'https://schema.org/Tuesday',
        'https://schema.org/Wednesday'
      ],
      opens: '10:00',
      closes: '20:00'
    });

    expect(second.dayOfWeek).toEqual(['https://schema.org/Thursday']);
    expect(second.closes).toBe('16:00');
  });

  it('«چهارشنبه» با «شنبه» اشتباه گرفته نمی‌شود', () => {
    const [only] = parseOpeningHours('چهارشنبه ۹ تا ۱۷');
    expect(only.dayOfWeek).toEqual(['https://schema.org/Wednesday']);
  });

  it('ساعت با دقیقه هم خوانده می‌شود', () => {
    const [only] = parseOpeningHours('جمعه ۹:۳۰ تا ۱۳:۴۵');
    expect(only.opens).toBe('09:30');
    expect(only.closes).toBe('13:45');
  });

  it('جمله‌ای که شکلش را نمی‌شناسیم چیزی تولید نمی‌کند', () => {
    expect(parseOpeningHours('همیشه باز')).toEqual([]);
    expect(parseOpeningHours('')).toEqual([]);
    expect(parseOpeningHours(undefined)).toEqual([]);
    expect(parseOpeningHours('شنبه تا ۲۰')).toEqual([]);
  });

  it('بازهٔ وارونه رد می‌شود، نه اینکه هفته را دور بزند', () => {
    expect(parseOpeningHours('پنجشنبه تا شنبه ۱۰ تا ۲۰')).toEqual([]);
  });
});

describe('عنوان و توضیح صفحهٔ کالا', () => {
  it('عنوان نام و خاستگاه و نام فروشگاه را دارد', () => {
    const t = itemTitle(coffee);
    expect(t).toContain('یرگاچف');
    expect(t).toContain('اتیوپی');
    expect(t).toContain(SITE_NAME);
  });

  it('توضیح از حد گوگل بلندتر نمی‌شود', () => {
    const long = { ...coffee, taste: 'الف '.repeat(200) };
    expect(itemDescription(long).length).toBeLessThanOrEqual(159);
    expect(itemDescription(long).endsWith('…')).toBe(true);
  });

  it('کالای بدون هیچ متنی هم توضیح خالی نمی‌گیرد', () => {
    const bare = { kind: 'coffee', slug: 'x', name: 'بی‌نام', price: 1, notes: [] };
    expect(itemDescription(bare).length).toBeGreaterThan(0);
  });

  it('clamp روی مرز کلمه می‌بُرد', () => {
    expect(clamp('یک دو سه چهار پنج', 10)).toBe('یک دو سه…');
  });
});
