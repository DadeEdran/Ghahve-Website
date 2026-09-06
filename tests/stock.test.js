/* ══════════════════════════════════════════════════
   رزرو موجودی.

   اینجا به مونگو وصل نمی‌شویم؛ به‌جایش یک مدل ساختگی
   می‌سازیم که همان ضمانتِ مهم مونگو را تقلید می‌کند:
   findOneAndUpdate شرط و کاهش را **یکجا** انجام می‌دهد.
   چیزی که واقعاً می‌خواهیم تست کنیم همین است — که کد ما
   به آن اتمی بودن تکیه کند و در شکست، چیزی از انبار
   کم نماند.
   ══════════════════════════════════════════════════ */

import { describe, it, expect } from 'vitest';
import { reserveStock, releaseStock, unitsFor, isTracked } from '../server/src/lib/stock.js';

/* مدل ساختگی روی یک آرایهٔ ساده. هر عملیات هم‌زمان‌ناپذیر
   است چون جاوااسکریپت تک‌نخی است — دقیقاً مثل تکِ سند
   مونگو که در لحظهٔ به‌روزرسانی قفل است. */
function fakeItems(docs) {
  const rows = docs.map((d) => ({ ...d }));

  return {
    rows,
    async findOneAndUpdate(filter, update) {
      const row = rows.find((r) => r.slug === filter.slug);
      if (!row) return null;
      /* شرط $gte عمداً با null جور نمی‌شود — همان رفتار مونگو */
      const need = filter.stock.$gte;
      if (typeof row.stock !== 'number' || row.stock < need) return null;
      row.stock += update.$inc.stock;
      return { slug: row.slug, stock: row.stock };
    },
    /* عمداً async نیست: کد واقعی findOne(...).lean() می‌نویسد،
       پس باید یک شیء با متد lean برگردد، نه یک Promise. */
    findOne(filter) {
      const row = rows.find((r) => r.slug === filter.slug);
      return { lean: async () => (row ? { stock: row.stock } : null) };
    },
    async updateOne(filter, update) {
      const row = rows.find((r) => r.slug === filter.slug);
      if (row && typeof row.stock === 'number') row.stock += update.$inc.stock;
      return { acknowledged: true };
    }
  };
}

const bean = (slug, stock, extra = {}) => ({
  slug,
  name: slug,
  kind: 'coffee',
  stock,
  ...extra
});

const line = (item, grams) => ({ kind: item.kind, item, grams, qty: 0 });
const piece = (item, qty) => ({ kind: 'gear', item, grams: 0, qty });

describe('unitsFor', () => {
  it('وزنی از گرم می‌خواند و ابزار از تعداد', () => {
    expect(unitsFor({ kind: 'coffee', grams: 250, qty: 0 })).toBe(250);
    expect(unitsFor({ kind: 'powder', grams: 50, qty: 0 })).toBe(50);
    expect(unitsFor({ kind: 'gear', grams: 0, qty: 3 })).toBe(3);
  });

  it('مقدار نامعتبر صفر می‌شود، نه NaN', () => {
    expect(unitsFor({ kind: 'coffee', grams: undefined })).toBe(0);
    expect(unitsFor({ kind: 'gear', qty: -2 })).toBe(0);
  });
});

describe('isTracked', () => {
  it('null و undefined یعنی نامحدود', () => {
    expect(isTracked({ stock: null })).toBe(false);
    expect(isTracked({})).toBe(false);
    expect(isTracked(undefined)).toBe(false);
  });

  it('صفر هم شمرده می‌شود — یعنی «تمام شد»، نه «نامحدود»', () => {
    expect(isTracked({ stock: 0 })).toBe(true);
    expect(isTracked({ stock: 900 })).toBe(true);
  });
});

describe('reserveStock', () => {
  it('کالای نامحدود اصلاً لمس نمی‌شود', async () => {
    const model = fakeItems([bean('yirga', null)]);
    const res = await reserveStock([line(model.rows[0], 5000)], model);

    expect(res.error).toBeNull();
    expect(res.taken).toEqual([]);
    expect(model.rows[0].stock).toBeNull();
  });

  it('موجودی کافی: دقیقاً به اندازهٔ سفارش کم می‌شود', async () => {
    const model = fakeItems([bean('yirga', 1000)]);
    const res = await reserveStock([line(model.rows[0], 250)], model);

    expect(res.error).toBeNull();
    expect(model.rows[0].stock).toBe(750);
  });

  it('مرز دقیق: آخرین گرم هم فروخته می‌شود', async () => {
    const model = fakeItems([bean('yirga', 250)]);
    const res = await reserveStock([line(model.rows[0], 250)], model);

    expect(res.error).toBeNull();
    expect(model.rows[0].stock).toBe(0);
  });

  it('یک گرم بیشتر از موجودی: خطا، و انبار دست‌نخورده', async () => {
    const model = fakeItems([bean('yirga', 250)]);
    const res = await reserveStock([line(model.rows[0], 251)], model);

    expect(res.error).toContain('کافی نیست');
    expect(res.error).toContain('250 گرم');
    expect(model.rows[0].stock).toBe(250);
  });

  it('موجودی صفر پیام خودش را دارد', async () => {
    const model = fakeItems([bean('yirga', 0)]);
    const res = await reserveStock([line(model.rows[0], 100)], model);

    expect(res.error).toBe('«yirga» فعلاً موجود نیست');
  });

  it('ابزار به عدد شمرده می‌شود، نه گرم', async () => {
    const model = fakeItems([bean('v60', 4, { kind: 'gear' })]);

    const ok = await reserveStock([piece(model.rows[0], 4)], model);
    expect(ok.error).toBeNull();
    expect(model.rows[0].stock).toBe(0);

    const fail = await reserveStock([piece(model.rows[0], 1)], model);
    expect(fail.error).toBe('«v60» فعلاً موجود نیست');

    /* و وقتی چیزی مانده، واحدش «عدد» است نه «گرم» */
    const few = fakeItems([bean('scale', 2, { kind: 'gear' })]);
    const short = await reserveStock([piece(few.rows[0], 5)], few);
    expect(short.error).toContain('2 عدد');
  });

  /* ── مهم‌ترین تست این فایل ── */
  it('شکست ردیف سوم، دو ردیف اول را پس می‌دهد', async () => {
    const model = fakeItems([bean('a', 1000), bean('b', 1000), bean('c', 100)]);

    const res = await reserveStock(
      [line(model.rows[0], 500), line(model.rows[1], 500), line(model.rows[2], 500)],
      model
    );

    expect(res.error).toContain('کافی نیست');
    expect(res.taken).toEqual([]);
    /* هیچ‌کدام نباید کم شده باشند — سفارش یا کامل، یا هیچ */
    expect(model.rows.map((r) => r.stock)).toEqual([1000, 1000, 100]);
  });

  it('دو ردیف از یک کالا روی هم حساب می‌شوند', async () => {
    const model = fakeItems([bean('yirga', 1000)]);
    const it = model.rows[0];

    const res = await reserveStock([line(it, 600), line(it, 600)], model);

    expect(res.error).toContain('کافی نیست');
    /* ردیف اول رزرو شده بود و باید برگشته باشد */
    expect(it.stock).toBe(1000);
  });

  it('ترکیب محدود و نامحدود: فقط محدودها کم می‌شوند', async () => {
    const model = fakeItems([bean('a', null), bean('b', 800)]);

    const res = await reserveStock([line(model.rows[0], 5000), line(model.rows[1], 300)], model);

    expect(res.error).toBeNull();
    expect(res.taken).toEqual([{ slug: 'b', amount: 300 }]);
    expect(model.rows[0].stock).toBeNull();
    expect(model.rows[1].stock).toBe(500);
  });
});

describe('releaseStock', () => {
  it('رزرو را دقیقاً به حالت اول برمی‌گرداند', async () => {
    const model = fakeItems([bean('yirga', 1000)]);

    const res = await reserveStock([line(model.rows[0], 400)], model);
    expect(model.rows[0].stock).toBe(600);

    /* همان چیزی که مسیر سفارش موقع شکستِ Order.create می‌کند */
    await releaseStock(res.taken, model);
    expect(model.rows[0].stock).toBe(1000);
  });

  it('فهرست خالی بی‌صدا رد می‌شود', async () => {
    const model = fakeItems([bean('yirga', 1000)]);
    await expect(releaseStock([], model)).resolves.toBeUndefined();
    await expect(releaseStock(undefined, model)).resolves.toBeUndefined();
    expect(model.rows[0].stock).toBe(1000);
  });
});
