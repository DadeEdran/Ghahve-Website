import { describe, it, expect } from 'vitest';
import { parseCart, loadCart, saveCart, CART_KEY } from '../web/src/lib/cartStorage.js';
import { lineKey } from '../web/src/lib/cartLine.js';

/* ══════════════════════════════════════════════════
   خواندن و نوشتن سبد — لایهٔ خالص.

   این منطق در نسخهٔ ویت داخل ShopContext بود و فقط با
   مرورگر تست می‌شد، یعنی عملاً هیچ‌وقت. با رندر سمت سرور
   حساس‌تر هم شد: ترتیب خواندن و نوشتن تعیین می‌کند که
   سبد مشتری بماند یا پاک شود.

   اینجا فقط شکل داده سنجیده می‌شود؛ چرخهٔ کاملِ
   «رندر سرور ← hydrate» در tests/web/cart-hydration.test.jsx
   است.
   ══════════════════════════════════════════════════ */

/* حافظهٔ بدلی — همان قراردادی که localStorage دارد */
function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _dump: () => Object.fromEntries(map)
  };
}

/* حافظه‌ای که خطا می‌دهد — حالت خصوصی مرورگر یا سهمیهٔ پر */
const hostileStorage = () => ({
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  }
});

describe('parseCart', () => {
  it('ردیف سالم را با شناسهٔ بازساخته برمی‌گرداند', () => {
    const raw = JSON.stringify([
      { slug: 'yirgacheffe', kind: 'coffee', grams: 500, qty: 0, grind: 'espresso', mix: [] }
    ]);
    const [line] = parseCart(raw);
    expect(line.slug).toBe('yirgacheffe');
    expect(line.grams).toBe(500);
    expect(line.grind).toBe('espresso');
    expect(line.key).toBe(lineKey('yirgacheffe', 'espresso', []));
  });

  it('شناسه را از فایل نمی‌پذیرد، خودش می‌سازد', () => {
    /* شناسهٔ جعلی می‌توانست ردیفی را با ردیف دیگری قاطی
       کند — مثلاً وزنِ یک قهوه را روی قهوهٔ دیگر ببرد. */
    const raw = JSON.stringify([
      { slug: 'a', kind: 'coffee', grams: 100, grind: '', mix: [], key: 'b||' }
    ]);
    expect(parseCart(raw)[0].key).toBe(lineKey('a', '', []));
  });

  it('ترکیب میکس را پاک‌سازی می‌کند', () => {
    const raw = JSON.stringify([
      {
        slug: 'blend',
        kind: 'coffee',
        grams: 250,
        mix: [
          { slug: 'cerrado', percent: '70.4' },
          { slug: 'monsooned', percent: 30 },
          { percent: 10 },
          null
        ]
      }
    ]);
    expect(parseCart(raw)[0].mix).toEqual([
      { slug: 'cerrado', percent: 70 },
      { slug: 'monsooned', percent: 30 }
    ]);
  });

  it('هر ورودیِ بی‌ربطی را به سبد خالی تبدیل می‌کند', () => {
    for (const raw of ['', 'null', '{}', '[1,2,3]', 'نه یک JSON', '{"a":1}', undefined]) {
      expect(parseCart(raw), String(raw)).toEqual([]);
    }
  });

  it('ردیف بی‌slug کنار گذاشته می‌شود', () => {
    const raw = JSON.stringify([{ grams: 100 }, { slug: 'ok', kind: 'coffee', grams: 100 }]);
    expect(parseCart(raw)).toHaveLength(1);
  });

  it('عددهای نامعتبر صفر می‌شوند، نه NaN', () => {
    const raw = JSON.stringify([{ slug: 'x', kind: 'coffee', grams: 'زیاد', qty: null }]);
    const [line] = parseCart(raw);
    expect(line.grams).toBe(0);
    expect(line.qty).toBe(0);
  });
});

describe('loadCart و saveCart', () => {
  it('چیزی که نوشته شده همان خوانده می‌شود', () => {
    const s = fakeStorage();
    const cart = [{ slug: 'x', kind: 'coffee', grams: 250, qty: 0, grind: 'whole', mix: [] }];
    expect(saveCart(s, cart)).toBe(true);
    expect(loadCart(s)).toEqual([{ ...cart[0], key: lineKey('x', 'whole', []) }]);
  });

  it('بدون حافظه — یعنی روی سرور — سبد خالی است و خطا نمی‌دهد', () => {
    /* این همان حالتی است که رندر سمت سرور دارد. */
    expect(loadCart(null)).toEqual([]);
    expect(saveCart(null, [{ slug: 'x' }])).toBe(false);
  });

  it('حافظهٔ خطادار فروشگاه را زمین نمی‌زند', () => {
    const s = hostileStorage();
    expect(loadCart(s)).toEqual([]);
    expect(saveCart(s, [])).toBe(false);
  });

  it('کلید همان کلید نسخهٔ ویت است — سبدِ مشتریانِ فعلی باید خوانده شود', () => {
    /* اگر این عوض شود، هر کسی که امروز سبد نیمه‌کاره دارد
       با رفتن به نسخهٔ تازه سبدش را از دست می‌دهد. */
    expect(CART_KEY).toBe('ghahve.cart');
  });
});
