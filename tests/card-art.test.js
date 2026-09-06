/* ══════════════════════════════════════════════════
   تصویر خودکار کارت‌ها — مورد ۴ سند ضعف‌ها.

   art.js یک **رشتهٔ** SVG می‌سازد و CardArt آن را با
   dangerouslySetInnerHTML تزریق می‌کند. یعنی برخلاف
   بقیهٔ رابط کاربری، اینجا React هیچ‌چیز را برایمان
   escape نمی‌کند؛ هرچه در رشته باشد، مرورگر همان را
   نشانه‌گذاری می‌خواند.

   نام کالا را مدیر در پنل می‌نویسد و مستقیم داخل
   aria-label می‌رود. نامی مثل `" onload="alert(1)`
   بدون escape گیومهٔ صفت را می‌بست و یک صفتِ اجراشدنی
   روی خودِ <svg> باز می‌کرد.

   این تست همان درز را می‌بندد: تگِ باز <svg> را دقیقاً
   با همان قاعده‌ای می‌خواند که مرورگر می‌خواند — نام
   صفت، مساوی، مقدار داخل گیومه — و می‌سنجد که نام کالا
   نتواند صفت تازه‌ای اضافه کند.

   به مرورگر و پایگاه داده نیاز ندارد: هر سه تابع خالص‌اند
   و شیء کالا را پارامتر می‌گیرند.
   ══════════════════════════════════════════════════ */

import { describe, it, expect } from 'vitest';
import { esc, productArt, gearArt, powderArt } from '../web/src/lib/art.js';

/* دو نامی که مدیر بدخواه می‌تواند در فرم کالا ذخیره کند:
   اولی از صفت بیرون می‌زند، دومی از خودِ تگ. */
const ATTR_BREAK = '" onload="alert(1)';
const TAG_BREAK = '"><script>alert(1)</script>';

/* کالاهای نمونه — کمینهٔ فیلدهایی که هر تابع لازم دارد */
const coffee = (name) => ({ kind: 'coffee', slug: 'test-bean', name, group: 'medium', meter: 3 });
const gear = (name, extra = {}) => ({
  kind: 'gear',
  slug: 'test-gear',
  name,
  group: 'pourover',
  mat: 'steel',
  shape: 'dripper',
  ...extra
});
const powder = (name) => ({
  kind: 'powder',
  slug: 'test-powder',
  name,
  group: 'chocolate',
  tone: 'cocoa',
  shape: 'scoop'
});

/* صفت‌های تگِ باز <svg …> را همان‌طور می‌خوانیم که مرورگر می‌خواند.
   اگر متن کالا بتواند گیومه را ببندد، اینجا یک صفت تازه ظاهر می‌شود. */
function rootAttrs(svg) {
  const tag = svg.match(/<svg\b[^>]*>/)?.[0] ?? '';
  const attrs = {};
  for (const [, k, v] of tag.matchAll(/([a-zA-Z_:][-\w:.]*)\s*=\s*"([^"]*)"/g)) attrs[k] = v;
  return attrs;
}

const ART = [
  ['قهوه', productArt, coffee],
  ['ابزار', gearArt, gear],
  ['پودر', powderArt, powder]
];

describe('esc', () => {
  it('هر پنج نویسهٔ خطرناک را جایگزین می‌کند', () => {
    expect(esc(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });

  it('متن فارسی سالم را دست‌نخورده رد می‌کند', () => {
    for (const s of ['اتیوپی یرگاچف', 'میکس بی‌کافئین', 'V60 کاغذی ۰۲']) {
      expect(esc(s)).toBe(s);
    }
  });

  it('نبودِ مقدار به رشتهٔ خالی تبدیل می‌شود، نه به «undefined»', () => {
    expect(esc(undefined)).toBe('');
    expect(esc(null)).toBe('');
  });

  it('& را یک بار escape می‌کند، نه دو بار', () => {
    expect(esc('قهوه & شیر')).toBe('قهوه &amp; شیر');
  });
});

describe.each(ART)('طرح %s با نام خصمانه', (_label, art, item) => {
  it('نام نمی‌تواند صفت تازه‌ای به تگ <svg> اضافه کند', () => {
    const attrs = rootAttrs(art(item(ATTR_BREAK)));
    expect(Object.keys(attrs).sort()).toEqual([
      'aria-label',
      'class',
      'preserveAspectRatio',
      'role',
      'viewBox'
    ]);
    expect(attrs.onload).toBeUndefined();
  });

  it('نام کامل، ولی بی‌خطر، داخل aria-label می‌ماند', () => {
    const { 'aria-label': label } = rootAttrs(art(item(ATTR_BREAK)));
    expect(label).toContain('&quot; onload=&quot;alert(1)');
    expect(label).not.toContain('"');
  });

  it('نام نمی‌تواند تگ را ببندد و <script> باز کند', () => {
    const svg = art(item(TAG_BREAK));
    expect(svg).not.toMatch(/<script/i);
    expect(rootAttrs(svg).onload).toBeUndefined();
    expect(rootAttrs(svg)['aria-label']).toContain('&lt;script&gt;');
  });

  it('نام سالم همچنان خوانا در aria-label می‌نشیند', () => {
    expect(rootAttrs(art(item('اتیوپی یرگاچف')))['aria-label']).toContain('اتیوپی یرگاچف');
  });
});

describe('zoom ابزار', () => {
  /* zoom عدد است و در مدل کران دارد، ولی مثل نام داخل یک صفت
     می‌نشیند؛ پس مقدار نامعتبر باید پیش از رسیدن به transform بیفتد. */
  it('عدد معتبر همان‌طور استفاده می‌شود', () => {
    expect(gearArt(gear('قیف', { zoom: 1.4 }))).toContain('scale(1.4)');
  });

  it('مقدار غیرعددی به پیش‌فرض ۱ برمی‌گردد و چیزی تزریق نمی‌کند', () => {
    for (const zoom of ['1) rotate(9)"', 'x', NaN, -2, 0, null, undefined]) {
      const svg = gearArt(gear('قیف', { zoom }));
      expect(svg).toContain('scale(1)');
      expect(svg).not.toContain('rotate(9)');
    }
  });
});

describe('خودِ سنجه دندان دارد', () => {
  /* اگر esc را از aria-label برداریم این تست باید بشکند. برای اینکه
     مطمئن باشیم می‌شکند، همان تگ را یک بار بدون escape می‌سازیم و
     می‌سنجیم که خواننده‌مان تزریق را واقعاً می‌بیند. */
  it('تگِ escape نشده صفت onload را لو می‌دهد', () => {
    const attrs = rootAttrs(`<svg role="img" aria-label="${ATTR_BREAK}"></svg>`);
    expect(attrs.onload).toBe('alert(1)');
  });
});
