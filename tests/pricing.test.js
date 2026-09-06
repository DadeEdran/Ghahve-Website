/* ══════════════════════════════════════════════════
   قیمت‌گذاری.

   اینجا روزی دو فایل بود — یکی سمت رابط کاربری و یکی در
   server — و یک تست همگامی که با سبدهای تصادفی مچ
   بودنشان را می‌سنجید. حالا هر دو طرف همین یک ماژول
   را import می‌کنند، پس آن تست موضوعی برای سنجیدن
   ندارد و برداشته شد: واگرایی دیگر ممکن نیست، نه
   اینکه کشف شود.

   پس این تست‌ها مستقیم روی @ghahve/shared می‌نشینند —
   همان کدی که سرور با آن سفارش ثبت می‌کند و مرورگر
   با آن قیمت نشان می‌دهد.
   ══════════════════════════════════════════════════ */

import { describe, it, expect } from 'vitest';
import {
  TIERS,
  SHIPPING,
  FREE_SHIPPING_FROM,
  priceFor,
  blendPricePerKg,
  unitPriceFor,
  computeTotals,
  lineTotal
} from '@ghahve/shared/pricing.js';

/* کالای ساختگی — فقط فیلدهایی که محاسبهٔ قیمت لمس می‌کند */
const coffee = (price) => ({ kind: 'coffee', price });
const gear = (price) => ({ kind: 'gear', price });
const noLookup = () => null;

describe('priceFor — گرد کردن به نزدیک‌ترین ۱۰۰۰ تومان', () => {
  it('یک کیلو یعنی دقیقاً قیمت هر کیلو', () => {
    expect(priceFor(1_850_000, 1000)).toBe(1_850_000);
  });

  it('۲۵۰ گرم از کیلویی ۱٬۸۵۰٬۰۰۰', () => {
    expect(priceFor(1_850_000, 250)).toBe(463_000); // ۴۶۲٬۵۰۰ → ۴۶۳٬۰۰۰
  });

  it('باقیمانده همیشه به هزارتای نزدیک می‌رود', () => {
    expect(priceFor(1_000_000, 100)).toBe(100_000);
    expect(priceFor(1_234_567, 100)).toBe(123_000); // ۱۲۳٬۴۵۶٫۷ → ۱۲۳٬۰۰۰
    expect(priceFor(1_235_567, 100)).toBe(124_000); // ۱۲۳٬۵۵۶٫۷ → ۱۲۴٬۰۰۰
  });

  it('وزن صفر یعنی قیمت صفر', () => {
    expect(priceFor(1_850_000, 0)).toBe(0);
  });
});

describe('computeTotals — مرزهای تخفیف و ارسال', () => {
  it('مرز ۹۹۹ گرم: بدون تخفیف و با هزینهٔ ارسال', () => {
    const t = computeTotals([{ kind: 'coffee', grams: 999, item: coffee(1_000_000) }], noLookup);
    expect(t.discount).toBe(0);
    expect(t.discountLabel).toBe('');
    expect(t.shipping).toBe(SHIPPING);
    expect(t.base).toBe(999_000);
    expect(t.total).toBe(999_000 + SHIPPING);
  });

  it('مرز ۱۰۰۰ گرم: ۵٪ تخفیف و ارسال رایگان', () => {
    const t = computeTotals([{ kind: 'coffee', grams: 1000, item: coffee(1_000_000) }], noLookup);
    expect(t.discountLabel).toBe('۵٪');
    expect(t.discount).toBe(50_000);
    expect(t.shipping).toBe(0);
    expect(t.total).toBe(950_000);
  });

  it('مرز ۳۰۰۰ گرم: ۲۹۹۹ هنوز ۵٪ است، ۳۰۰۰ می‌شود ۱۰٪', () => {
    const under = computeTotals(
      [{ kind: 'coffee', grams: 2999, item: coffee(1_000_000) }],
      noLookup
    );
    const over = computeTotals(
      [{ kind: 'coffee', grams: 3000, item: coffee(1_000_000) }],
      noLookup
    );
    expect(under.discountLabel).toBe('۵٪');
    expect(over.discountLabel).toBe('۱۰٪');
    expect(over.discount).toBe(300_000);
  });

  it('مرز ۵۰۰۰ گرم: ۴۹۹۹ هنوز ۱۰٪ است، ۵۰۰۰ می‌شود ۱۵٪', () => {
    const under = computeTotals(
      [{ kind: 'coffee', grams: 4999, item: coffee(1_000_000) }],
      noLookup
    );
    const over = computeTotals(
      [{ kind: 'coffee', grams: 5000, item: coffee(1_000_000) }],
      noLookup
    );
    expect(under.discountLabel).toBe('۱۰٪');
    expect(over.discountLabel).toBe('۱۵٪');
    expect(over.discount).toBe(750_000);
  });

  it('وزن‌ها روی هم جمع می‌شوند؛ پودر هم وزنی است', () => {
    const t = computeTotals(
      [
        { kind: 'coffee', grams: 600, item: coffee(1_000_000) },
        { kind: 'powder', grams: 400, item: { kind: 'powder', price: 1_000_000 } }
      ],
      noLookup
    );
    expect(t.grams).toBe(1000);
    expect(t.discountLabel).toBe('۵٪');
    expect(t.shipping).toBe(0);
  });
});

describe('computeTotals — ابزار', () => {
  it('تخفیف روی ابزار اعمال نمی‌شود', () => {
    const t = computeTotals(
      [
        { kind: 'coffee', grams: 5000, item: coffee(1_000_000) },
        { kind: 'gear', qty: 1, item: gear(10_000_000) }
      ],
      noLookup
    );
    expect(t.base).toBe(15_000_000);
    expect(t.discount).toBe(750_000); // ۱۵٪ فقط روی ۵ میلیون وزنی
    expect(t.total).toBe(14_250_000);
  });

  it('ابزار در وزن سبد شمرده نمی‌شود، در تعداد شمرده می‌شود', () => {
    const t = computeTotals([{ kind: 'gear', qty: 3, item: gear(2_000_000) }], noLookup);
    expect(t.grams).toBe(0);
    expect(t.pieces).toBe(3);
    expect(t.base).toBe(6_000_000);
  });

  it('سبد فقط-ابزار همیشه هزینهٔ ارسال دارد', () => {
    /* لبهٔ تیزِ شناخته‌شده (مورد ۳۷ سند ضعف‌ها): چون
       ارسال رایگان به گرم بسته است نه به مبلغ. این تست
       رفتار فعلی را قفل می‌کند تا اگر روزی عوض شد،
       آگاهانه عوض شود. */
    const t = computeTotals([{ kind: 'gear', qty: 1, item: gear(96_000_000) }], noLookup);
    expect(t.shipping).toBe(SHIPPING);
    expect(t.total).toBe(96_000_000 + SHIPPING);
  });
});

describe('computeTotals — سبد خالی', () => {
  it('همه‌چیز صفر است و ارسالی هم حساب نمی‌شود', () => {
    const t = computeTotals([], noLookup);
    expect(t).toEqual({
      grams: 0,
      pieces: 0,
      base: 0,
      discount: 0,
      discountLabel: '',
      shipping: 0,
      total: 0
    });
  });
});

describe('blendPricePerKg — میانگین وزنی + دستمزد میکس', () => {
  const beans = {
    a: coffee(1_000_000),
    b: coffee(2_000_000)
  };
  const lookup = (slug) => beans[slug];
  const blend = { price: 9_999_999, surcharge: 50_000, components: [{ slug: 'a', percent: 100 }] };

  it('نصف-نصف یعنی میانگین ساده به‌علاوهٔ دستمزد', () => {
    const mix = [
      { slug: 'a', percent: 50 },
      { slug: 'b', percent: 50 }
    ];
    expect(blendPricePerKg(blend, mix, lookup)).toBe(1_550_000);
  });

  it('نسبت نامساوی، وزنی حساب می‌شود', () => {
    const mix = [
      { slug: 'a', percent: 70 },
      { slug: 'b', percent: 30 }
    ];
    expect(blendPricePerKg(blend, mix, lookup)).toBe(1_350_000); // ۱٬۳۰۰٬۰۰۰ + ۵۰٬۰۰۰
  });

  it('اگر مجموع درصدها ۱۰۰ نباشد، باز هم نسبت درست می‌ماند', () => {
    const mix = [
      { slug: 'a', percent: 25 },
      { slug: 'b', percent: 25 }
    ];
    expect(blendPricePerKg(blend, mix, lookup)).toBe(1_550_000);
  });

  it('میکس خالی یعنی برگشت به ترکیب پیشنهادی خودمان', () => {
    expect(blendPricePerKg(blend, [], lookup)).toBe(1_050_000);
  });

  it('دانهٔ ناشناخته یعنی برگشت به قیمت پایهٔ میکس', () => {
    const mix = [
      { slug: 'a', percent: 50 },
      { slug: 'ghost', percent: 50 }
    ];
    expect(blendPricePerKg(blend, mix, lookup)).toBe(blend.price);
  });

  it('همهٔ درصدها صفر یعنی برگشت به قیمت پایه', () => {
    const mix = [
      { slug: 'a', percent: 0 },
      { slug: 'b', percent: 0 }
    ];
    expect(blendPricePerKg(blend, mix, lookup)).toBe(blend.price);
  });

  it('نبودِ دستمزد مشکلی نمی‌سازد', () => {
    const noFee = { price: 1, components: [] };
    const mix = [
      { slug: 'a', percent: 50 },
      { slug: 'b', percent: 50 }
    ];
    expect(blendPricePerKg(noFee, mix, lookup)).toBe(1_500_000);
  });
});

describe('unitPriceFor و lineTotal', () => {
  const beans = { a: coffee(1_000_000), b: coffee(2_000_000) };
  const lookup = (slug) => beans[slug];

  it('کالای غیرمیکس همان قیمت خودش را دارد', () => {
    const line = { kind: 'coffee', grams: 250, item: coffee(1_850_000) };
    expect(unitPriceFor(line, lookup)).toBe(1_850_000);
    expect(lineTotal(line, lookup)).toBe(463_000);
  });

  it('میکس، قیمتش از ترکیب می‌آید نه از فیلد price', () => {
    const line = {
      kind: 'coffee',
      grams: 500,
      item: { price: 9_999_999, surcharge: 0, isBlend: true, components: [] },
      mix: [
        { slug: 'a', percent: 50 },
        { slug: 'b', percent: 50 }
      ]
    };
    expect(unitPriceFor(line, lookup)).toBe(1_500_000);
    expect(lineTotal(line, lookup)).toBe(750_000);
  });

  it('ردیف ابزار = قیمت × تعداد، بدون گرد کردن دوباره', () => {
    const line = { kind: 'gear', qty: 4, item: gear(1_250_500) };
    expect(lineTotal(line, lookup)).toBe(5_002_000);
  });
});

describe('پله‌ها و ثابت‌ها', () => {
  it('پله‌ها از بزرگ به کوچک مرتب‌اند تا find اولین تطابق درست را بدهد', () => {
    const mins = TIERS.map((t) => t.min);
    expect(mins).toEqual([...mins].sort((a, b) => b - a));
    expect(TIERS[TIERS.length - 1].min).toBe(0);
  });

  it('عددهای تجاری همان‌اند که سند می‌گوید', () => {
    expect(SHIPPING).toBe(65_000);
    expect(FREE_SHIPPING_FROM).toBe(1000);
  });
});
