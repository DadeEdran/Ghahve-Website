/* ══════════════════════════════════════════════════
   حالت تصویری ساز میکس.

   قاعدهٔ طلایی این حالت یک جمله است: **نمای دیگر، نه
   منطق دیگر**. مشتری همان ترکیب را با کیسه و دستگاه
   می‌بیند، ولی چیزی که ته کار به سبد می‌رود باید مو به
   مو همان چیزی باشد که از راه اهرم‌های ساده می‌رفت.

   پس مهم‌ترین تست این فایل آخری است: یک میکس، دو راه،
   یک ردیف سبدِ بایت‌به‌بایت یکسان.

   بقیه‌اش ریاضیِ نمایش است — مدت ریختن هر کیسه، سطح
   قیف، جای ایستادن کیسه‌ها و رنگِ ترکیب. همه تابع خالص‌اند
   و به مرورگر و پایگاه داده کاری ندارند.
   ══════════════════════════════════════════════════ */

import { describe, it, expect } from 'vitest';
import {
  SCENE,
  STAGES,
  POUR_BUDGET,
  POUR_MIN,
  pourPlan,
  pourTotal,
  sackLayout,
  hopperLevel,
  stageMessage
} from '../web/src/lib/blendVisual.js';
import { mixTone, roastTone, blendBagArt, esc } from '../web/src/lib/art.js';
import { buildLine, mixSignature } from '../web/src/lib/cartLine.js';
import { applyPercent, startingMix } from '../web/src/lib/blend.js';

const mix3 = () => [
  { slug: 'a', percent: 50 },
  { slug: 'b', percent: 30 },
  { slug: 'c', percent: 20 }
];

/* ─────────────── زمان‌بندی ریختن ─────────────── */

describe('pourPlan', () => {
  it('کل مرحلهٔ ریختن دقیقاً به‌اندازهٔ بودجه است، نه بیشتر', () => {
    for (const parts of [mix3(), [{ slug: 'a', percent: 100 }], startingMix({ components: [] })]) {
      const plan = pourPlan(parts);
      if (plan.length) expect(pourTotal(plan)).toBe(POUR_BUDGET);
    }
  });

  it('کیسهٔ پرسهم‌تر محسوس‌تر می‌ریزد', () => {
    const [big, small] = pourPlan([
      { slug: 'a', percent: 70 },
      { slug: 'b', percent: 30 }
    ]);
    expect(big.ms).toBeGreaterThan(small.ms);
    /* «محسوس» یعنی چشم فرقش را ببیند، نه اینکه فقط عددش بزرگ‌تر باشد */
    expect(big.ms - small.ms).toBeGreaterThan(400);
  });

  it('کیسهٔ کم‌سهم هم کف زمانی دارد تا اصلاً دیده شود', () => {
    const plan = pourPlan([
      { slug: 'a', percent: 95 },
      { slug: 'b', percent: 5 }
    ]);
    expect(plan[1].ms).toBeGreaterThanOrEqual(POUR_MIN);
  });

  it('با دانهٔ زیاد که بودجه به کفشان نمی‌رسد، مساوی پخش می‌شود', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ slug: `b${i}`, percent: 100 / 12 }));
    const plan = pourPlan(many);
    expect(pourTotal(plan)).toBe(POUR_BUDGET);
    expect(Math.max(...plan.map((p) => p.ms))).toBeLessThan(400);
  });

  it('دانهٔ صفر اصلاً نوبت ریختن ندارد', () => {
    const plan = pourPlan([
      { slug: 'a', percent: 100 },
      { slug: 'b', percent: 0 }
    ]);
    expect(plan.map((p) => p.slug)).toEqual(['a']);
  });

  it('ترتیبِ انتخاب مشتری را به‌هم نمی‌زند', () => {
    /* اگر روزی اینجا sort اضافه شود، ترتیب mix در ردیف سبد هم
       عوض می‌شود — همان چیزی که تست پایانی جلویش را می‌گیرد. */
    const plan = pourPlan([
      { slug: 'z', percent: 20 },
      { slug: 'a', percent: 80 }
    ]);
    expect(plan.map((p) => p.slug)).toEqual(['z', 'a']);
  });

  it('ترکیب خالی برنامه‌ای ندارد', () => {
    expect(pourPlan([])).toEqual([]);
    expect(pourPlan(undefined)).toEqual([]);
  });
});

/* ─────────────── سطح قیف ─────────────── */

describe('hopperLevel', () => {
  const plan = pourPlan(mix3());

  it('قیف خالی شروع می‌شود و با کیسهٔ آخر پر می‌شود', () => {
    expect(hopperLevel(plan, 0)).toBe(0);
    expect(hopperLevel(plan, plan.length)).toBe(1);
  });

  it('هر کیسه سطح را جلو می‌برد، هیچ‌وقت عقب نه', () => {
    let last = 0;
    for (let k = 1; k <= plan.length; k++) {
      const lvl = hopperLevel(plan, k);
      expect(lvl).toBeGreaterThan(last);
      last = lvl;
    }
  });

  it('سطح، سهمِ تجمعی است — نه شمارشِ کیسه‌ها', () => {
    /* ۵۰٪ اول یعنی نیمهٔ قیف، هرچند فقط یکی از سه کیسه ریخته */
    expect(hopperLevel(plan, 1)).toBeCloseTo(0.5, 4);
    expect(hopperLevel(plan, 2)).toBeCloseTo(0.8, 4);
  });
});

/* ─────────────── چیدمان کیسه‌ها ─────────────── */

describe('sackLayout', () => {
  it('کیسهٔ پرسهم‌تر بزرگ‌تر است', () => {
    const [big, small] = sackLayout([
      { slug: 'a', percent: 80 },
      { slug: 'b', percent: 20 }
    ]);
    expect(big.scale).toBeGreaterThan(small.scale);
  });

  it('کیسه‌ها با هر تعدادی داخل قاب می‌مانند', () => {
    for (const n of [2, 3, 5, 8, 12]) {
      const parts = Array.from({ length: n }, (_, i) => ({ slug: `b${i}`, percent: 100 / n }));
      for (const s of sackLayout(parts)) {
        expect(s.x).toBeLessThanOrEqual(SCENE.first);
        expect(s.x).toBeGreaterThanOrEqual(SCENE.last);
      }
    }
  });

  it('اولین انتخاب راست‌ترین کیسه است — جهت خواندن فارسی', () => {
    const l = sackLayout(mix3());
    expect(l[0].x).toBeGreaterThan(l[1].x);
    expect(l.map((s) => s.slug)).toEqual(['a', 'b', 'c']);
  });

  it('دهانهٔ هر کیسه — کوچک یا بزرگ — دقیقاً سر قیف می‌ایستد', () => {
    /* کیسه حول پایه‌اش می‌چرخد، پس اگر جای پایه با بزرگیِ کیسه
       تنظیم نشود، کیسهٔ کوچک بالای هوا خالی می‌کند. */
    const rad = (SCENE.tilt * Math.PI) / 180;
    const up = [Math.sin(rad), -Math.cos(rad)];

    for (const s of sackLayout([
      { slug: 'a', percent: 95 },
      { slug: 'b', percent: 5 }
    ])) {
      const reach = SCENE.mouth * s.scale;
      expect(s.hx + reach * up[0]).toBeCloseTo(SCENE.hopper.x, 1);
      expect(s.hy + reach * up[1]).toBeCloseTo(SCENE.hopper.y, 1);
    }
  });
});

/* ─────────────── پیام مرحله‌ها ─────────────── */

describe('stageMessage', () => {
  it('هر چهار مرحله پیام فارسی با عدد فارسی دارند', () => {
    for (const s of STAGES) {
      const msg = stageMessage(s, mix3());
      expect(msg).toMatch(/^مرحلهٔ [۰-۹]+ از ۴ — .+/);
      expect(msg).not.toMatch(/[0-9]/);
    }
  });
});

/* ─────────────── رنگِ ترکیب ─────────────── */

describe('mixTone', () => {
  it('میکسِ تک‌دانه همان رنگ خودِ دانه است', () => {
    expect(mixTone([{ meter: 2, percent: 100 }])).toEqual(roastTone(2));
  });

  it('نصف-نصفِ دو رست، دقیقاً وسطشان می‌نشیند', () => {
    const [a] = roastTone(1);
    const [b] = roastTone(5);
    const [mid] = mixTone([
      { meter: 1, percent: 50 },
      { meter: 5, percent: 50 }
    ]);
    const ch = (hex, i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
    for (const i of [0, 1, 2]) {
      expect(ch(mid, i)).toBe(Math.round((ch(a, i) + ch(b, i)) / 2));
    }
  });

  it('سهمِ بیشتر، رنگ را به خودش نزدیک‌تر می‌کند', () => {
    const dark = (hex) => parseInt(hex.slice(1, 3), 16);
    const mostlyLight = mixTone([
      { meter: 1, percent: 90 },
      { meter: 5, percent: 10 }
    ]);
    const mostlyDark = mixTone([
      { meter: 1, percent: 10 },
      { meter: 5, percent: 90 }
    ]);
    expect(dark(mostlyLight[0])).toBeGreaterThan(dark(mostlyDark[0]));
  });

  it('دانهٔ صفر روی رنگ اثری ندارد', () => {
    expect(
      mixTone([
        { meter: 2, percent: 100 },
        { meter: 5, percent: 0 }
      ])
    ).toEqual(roastTone(2));
  });

  it('ترکیب خالی به رنگ رستِ میانه برمی‌گردد، نه به رنگ نامعتبر', () => {
    expect(mixTone([])).toEqual(roastTone(3));
    for (const hex of mixTone(undefined)) expect(hex).toMatch(/^#[0-9A-F]{6}$/);
  });
});

/* ─────────────── بستهٔ آماده ─────────────── */

describe('blendBagArt', () => {
  const ATTR_BREAK = '" onload="alert(1)';

  const rootAttrs = (svg) => {
    const tag = svg.match(/<svg\b[^>]*>/)?.[0] ?? '';
    const attrs = {};
    for (const [, k, v] of tag.matchAll(/([a-zA-Z_:][-\w:.]*)\s*=\s*"([^"]*)"/g)) attrs[k] = v;
    return attrs;
  };

  const bag = (over = {}) =>
    blendBagArt({
      slug: 'house-blend',
      name: 'میکس اسپرسو',
      parts: [
        { name: 'سرادو', percent: 70, meter: 4 },
        { name: 'یرگاچف', percent: 30, meter: 2 }
      ],
      ...over
    });

  it('نام میکس و نام دانه‌ها با درصدِ فارسی روی بسته چاپ می‌شوند', () => {
    const svg = bag();
    expect(svg).toContain('میکس اسپرسو');
    expect(svg).toContain('سرادو · ٪۷۰');
    expect(svg).toContain('یرگاچف · ٪۳۰');
    expect(svg).toContain('رُست‌خانهٔ دانه');
  });

  it('رنگ بسته از میانگین وزنیِ همان دانه‌هاست', () => {
    const [, c2] = mixTone([
      { meter: 4, percent: 70 },
      { meter: 2, percent: 30 }
    ]);
    expect(bag()).toContain(c2);
  });

  it('نام میکس نمی‌تواند صفتی به تگ <svg> اضافه کند', () => {
    const attrs = rootAttrs(bag({ name: ATTR_BREAK }));
    expect(attrs.onload).toBeUndefined();
    expect(attrs['aria-label']).toContain(esc(ATTR_BREAK));
  });

  it('نام دانه هم از esc رد می‌شود، نه فقط نام میکس', () => {
    const svg = bag({ parts: [{ name: '<script>alert(1)</script>', percent: 100, meter: 3 }] });
    expect(svg).not.toMatch(/<script/i);
    expect(svg).toContain('&lt;script&gt;');
  });

  it('شناسهٔ گرادیان از slug می‌آید تا دو میکسِ هم‌زمان رنگ هم را ندزدند', () => {
    const a = blendBagArt({ slug: 'mix-a', name: 'الف', parts: [{ percent: 100, meter: 1 }] });
    const b = blendBagArt({ slug: 'mix-b', name: 'ب', parts: [{ percent: 100, meter: 5 }] });
    const idOf = (svg) => svg.match(/<linearGradient id="(body[^"]+)"/)[1];
    expect(idOf(a)).not.toBe(idOf(b));
  });

  it('میکس پرشمار روی بسته خلاصه می‌شود، نه اینکه سرریز کند', () => {
    const parts = Array.from({ length: 7 }, (_, i) => ({
      name: `دانه ${i}`,
      percent: 100 / 7,
      meter: 3
    }));
    const svg = blendBagArt({ slug: 'big', name: 'میکس بزرگ', parts });
    expect(svg).toContain('و ۳ دانهٔ دیگر');
  });
});

/* ═══════════════════════════════════════════════════
   قلبِ ماجرا: یک میکس، دو راه، یک ردیف سبد.
   ═══════════════════════════════════════════════════ */

describe('حالت ساده و حالت تصویری به یک ردیف سبد می‌رسند', () => {
  const item = {
    slug: 'house-espresso',
    kind: 'coffee',
    isBlend: true,
    grindable: true,
    components: [
      { slug: 'serado', percent: 60 },
      { slug: 'yirga', percent: 40 }
    ]
  };

  /* حالت تصویری همان آرایهٔ mix را به دست دارد؛ چیزی که *واقعاً*
     در صحنه اتفاق می‌افتد از pourPlan می‌آید. پس اگر روزی نمایش،
     ترتیب یا درصدی را دست‌کاری کند، ردیف بازساخته از برنامهٔ ریختن
     با ردیف حالت ساده فرق می‌کند و این تست می‌شکند. */
  const asPoured = (mix) => pourPlan(mix).map((p) => ({ slug: p.slug, percent: p.percent }));

  const bothWays = (mix, grams = 250, grind = 'espresso') => ({
    simple: buildLine(item, grams, { grind, mix }),
    visual: buildLine(item, grams, { grind, mix: asPoured(mix) })
  });

  it('ترکیب پیشنهادی خودمان', () => {
    const { simple, visual } = bothWays(startingMix(item));
    expect(JSON.stringify(visual)).toBe(JSON.stringify(simple));
  });

  it('بعد از جابه‌جا کردن اهرم‌ها', () => {
    let mix = startingMix(item);
    for (const v of [80, 35, 70]) mix = applyPercent(mix, 'serado', v);
    const { simple, visual } = bothWays(mix);
    expect(JSON.stringify(visual)).toBe(JSON.stringify(simple));
    expect(visual.key).toBe(simple.key);
  });

  it('با دانهٔ صفرشده — که کیسه‌اش اصلاً نمی‌ریزد', () => {
    /* در حالت ساده دانهٔ صفر هنوز در حالتِ صفحه هست ولی به سبد
       نمی‌رود؛ در حالت تصویری اصلاً کیسه‌ای برایش بالا نمی‌رود.
       هر دو باید به یک ردیف برسند. */
    let mix = [
      { slug: 'serado', percent: 40 },
      { slug: 'yirga', percent: 40 },
      { slug: 'huila', percent: 20 }
    ];
    mix = applyPercent(mix, 'huila', 0);
    const { simple, visual } = bothWays(mix);

    expect(simple.mix.some((m) => m.slug === 'huila')).toBe(false);
    expect(JSON.stringify(visual)).toBe(JSON.stringify(simple));
  });

  it('با ترتیبِ انتخابِ غیرالفبایی — ترتیب نباید عوض شود', () => {
    const mix = [
      { slug: 'zambia', percent: 25 },
      { slug: 'brazil', percent: 55 },
      { slug: 'aceh', percent: 20 }
    ];
    const { simple, visual } = bothWays(mix);
    expect(visual.mix.map((m) => m.slug)).toEqual(['zambia', 'brazil', 'aceh']);
    expect(JSON.stringify(visual)).toBe(JSON.stringify(simple));
  });

  it('هر وزن و هر آسیابی که باشد', () => {
    const mix = applyPercent(startingMix(item), 'serado', 45);
    for (const grams of [100, 250, 1000]) {
      for (const grind of ['whole', 'espresso', 'v60']) {
        const { simple, visual } = bothWays(mix, grams, grind);
        expect(JSON.stringify(visual)).toBe(JSON.stringify(simple));
      }
    }
  });

  it('شناسهٔ ردیف هم یکی است — پس دو بار افزودن، یک ردیف می‌شود', () => {
    const mix = applyPercent(startingMix(item), 'yirga', 55);
    const { simple, visual } = bothWays(mix);
    expect(mixSignature(visual.mix)).toBe(mixSignature(simple.mix));
    expect(visual.key).toBe(simple.key);
  });

  it('خودِ سنجه دندان دارد: ترکیبِ دست‌خورده ردیف دیگری می‌سازد', () => {
    /* اگر روزی buildLine همه‌چیز را یکسان کند، تست‌های بالا بی‌معنی
       می‌شوند. پس یک بار عمداً ترکیب را عوض می‌کنیم تا مطمئن شویم
       تفاوت را می‌بیند. */
    const mix = startingMix(item);
    const other = applyPercent(mix, 'serado', 10);
    expect(buildLine(item, 250, { mix: other }).key).not.toBe(buildLine(item, 250, { mix }).key);
  });
});
