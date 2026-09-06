/* ══════════════════════════════════════════════════
   ریاضیِ میکس. قاعدهٔ طلایی: هرچه مشتری با اهرم‌ها
   بکند، مجموع درصدها باید دقیقاً ۱۰۰ بماند.
   ══════════════════════════════════════════════════ */

import { describe, it, expect } from 'vitest';
import {
  startingMix,
  sumOf,
  applyPercent,
  addBean,
  removeBean,
  mixError
} from '../web/src/lib/blend.js';

const mix3 = () => [
  { slug: 'a', percent: 50 },
  { slug: 'b', percent: 30 },
  { slug: 'c', percent: 20 }
];

describe('startingMix', () => {
  it('ترکیب پیشنهادی را با درصد گِردشده برمی‌دارد', () => {
    const item = {
      components: [
        { slug: 'a', percent: 60.4 },
        { slug: 'b', percent: 39.6 }
      ]
    };
    expect(startingMix(item)).toEqual([
      { slug: 'a', percent: 60 },
      { slug: 'b', percent: 40 }
    ]);
  });

  it('کالای بدون ترکیب، آرایهٔ خالی می‌دهد', () => {
    expect(startingMix({})).toEqual([]);
  });
});

describe('applyPercent — مجموع همیشه ۱۰۰ می‌ماند', () => {
  it('دنبالهٔ حرکت‌های اهرم روی یک دانه', () => {
    let mix = mix3();
    for (const v of [0, 15, 33, 67, 100, 42]) {
      mix = applyPercent(mix, 'a', v);
      expect(sumOf(mix)).toBe(100);
      expect(mix.find((p) => p.slug === 'a').percent).toBe(v);
    }
  });

  it('حرکت روی هر سه دانه، به‌صورت درهم', () => {
    let mix = mix3();
    for (const [slug, v] of [
      ['b', 90],
      ['c', 5],
      ['a', 80],
      ['b', 0],
      ['c', 100],
      ['a', 33]
    ]) {
      mix = applyPercent(mix, slug, v);
      expect(sumOf(mix)).toBe(100);
      expect(mix.every((p) => p.percent >= 0 && p.percent <= 100)).toBe(true);
    }
  });

  it('هزار حرکت تصادفی هم مجموع را خراب نمی‌کند', () => {
    /* اهرم‌ها را همان‌طور که یک مشتری بی‌حوصله می‌کشد:
       تصادفی، پشت‌سرهم، روی دانه‌های مختلف. */
    let seed = 20260812;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

    let mix = [
      { slug: 'a', percent: 25 },
      { slug: 'b', percent: 25 },
      { slug: 'c', percent: 25 },
      { slug: 'd', percent: 25 }
    ];

    for (let i = 0; i < 1000; i += 1) {
      const slug = mix[Math.floor(rnd() * mix.length)].slug;
      mix = applyPercent(mix, slug, Math.round(rnd() * 100));
      expect(sumOf(mix)).toBe(100);
      for (const p of mix) {
        expect(p.percent).toBeGreaterThanOrEqual(0);
        expect(p.percent).toBeLessThanOrEqual(100);
        expect(Number.isInteger(p.percent)).toBe(true);
      }
    }
  });

  it('مقدار بیرون از بازه بریده می‌شود', () => {
    expect(applyPercent(mix3(), 'a', 999).find((p) => p.slug === 'a').percent).toBe(100);
    expect(applyPercent(mix3(), 'a', -50).find((p) => p.slug === 'a').percent).toBe(0);
  });

  it('وقتی یکی ۱۰۰ می‌شود، بقیه صفر می‌شوند', () => {
    const mix = applyPercent(mix3(), 'a', 100);
    expect(mix.find((p) => p.slug === 'b').percent).toBe(0);
    expect(mix.find((p) => p.slug === 'c').percent).toBe(0);
  });

  it('سهم آزادشده به نسبت جای خالی پخش می‌شود', () => {
    /* a از ۵۰ به ۲۰ می‌رود: ۳۰ واحد آزاد می‌شود و بین b و c
       به نسبت جای خالی‌شان (۷۰ و ۸۰) تقسیم می‌شود. */
    const mix = applyPercent(mix3(), 'a', 20);
    expect(mix.find((p) => p.slug === 'a').percent).toBe(20);
    expect(sumOf(mix)).toBe(100);
    expect(mix.find((p) => p.slug === 'b').percent).toBeGreaterThan(30);
    expect(mix.find((p) => p.slug === 'c').percent).toBeGreaterThan(20);
  });

  it('دانهٔ ناشناخته، ترکیب را دست‌نخورده برمی‌گرداند', () => {
    const before = mix3();
    expect(applyPercent(before, 'ghost', 50)).toBe(before);
  });

  it('میکس تک‌دانه جایی برای جابه‌جایی ندارد', () => {
    const one = [{ slug: 'a', percent: 100 }];
    expect(applyPercent(one, 'a', 40)).toBe(one);
  });

  it('مقدار تکراری یعنی بدون تغییر', () => {
    const before = mix3();
    expect(applyPercent(before, 'a', 50)).toBe(before);
  });

  it('ورودی غیرعددی مثل صفر رفتار می‌کند', () => {
    const mix = applyPercent(mix3(), 'a', 'سلام');
    expect(mix.find((p) => p.slug === 'a').percent).toBe(0);
    expect(sumOf(mix)).toBe(100);
  });
});

describe('addBean', () => {
  it('دانهٔ تازه سهمش را از بقیه می‌گیرد و مجموع ۱۰۰ می‌ماند', () => {
    const mix = addBean(mix3(), 'd', 20);
    expect(mix).toHaveLength(4);
    expect(mix.find((p) => p.slug === 'd').percent).toBe(20);
    expect(sumOf(mix)).toBe(100);
  });

  it('دانهٔ تکراری دوباره اضافه نمی‌شود', () => {
    const before = mix3();
    expect(addBean(before, 'a')).toBe(before);
  });

  it('سهم پیش‌فرض ۲۰ است', () => {
    expect(addBean(mix3(), 'd').find((p) => p.slug === 'd').percent).toBe(20);
  });
});

describe('removeBean', () => {
  it('سهم دانهٔ برداشته‌شده بین بقیه پخش می‌شود', () => {
    const mix = removeBean(mix3(), 'c');
    expect(mix).toHaveLength(2);
    expect(mix.some((p) => p.slug === 'c')).toBe(false);
    expect(sumOf(mix)).toBe(100);
  });

  it('میکس به کمتر از دو دانه نمی‌رسد', () => {
    const two = [
      { slug: 'a', percent: 60 },
      { slug: 'b', percent: 40 }
    ];
    expect(removeBean(two, 'a')).toBe(two);
  });
});

describe('mixError — همان قواعدی که سرور هم بررسی می‌کند', () => {
  it('ترکیب درست، خطا ندارد', () => {
    expect(mixError(mix3())).toBe('');
  });

  it('کمتر از دو دانهٔ زنده یعنی خطا', () => {
    expect(
      mixError([
        { slug: 'a', percent: 100 },
        { slug: 'b', percent: 0 }
      ])
    ).toBe('میکس باید دست‌کم دو دانه داشته باشد');
  });

  it('مجموعِ دور از ۱۰۰ یعنی خطا', () => {
    expect(
      mixError([
        { slug: 'a', percent: 50 },
        { slug: 'b', percent: 30 }
      ])
    ).toContain('مجموع درصدها باید ۱۰۰ باشد');
  });

  it('یک واحد اختلاف بخشیده می‌شود', () => {
    expect(
      mixError([
        { slug: 'a', percent: 50 },
        { slug: 'b', percent: 49 }
      ])
    ).toBe('');
    expect(
      mixError([
        { slug: 'a', percent: 50 },
        { slug: 'b', percent: 51 }
      ])
    ).toBe('');
  });
});
