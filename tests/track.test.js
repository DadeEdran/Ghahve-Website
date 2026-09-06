/* ══════════════════════════════════════════════════
   پیگیری سفارش — مورد ۳۵ سند ضعف‌ها.

   مثل بقیهٔ تست‌های این پوشه به مونگو دست نمی‌زنیم:
   findOrderForTracking مدل را پارامتر می‌گیرد، پس یک
   مدل ساختگی با findOne().lean() کافی است.

   مهم‌ترین چیزی که اینجا قفل می‌شود، رفتار امنیتی است:
   پاسخِ «کد وجود ندارد» و «شماره جور نیست» باید حرف به
   حرف یکی باشند.
   ══════════════════════════════════════════════════ */

import { describe, it, expect } from 'vitest';
import {
  normalizePhone,
  normalizeCode,
  safeEqual,
  publicOrderView,
  findOrderForTracking,
  NOT_FOUND_MESSAGE
} from '../server/src/lib/track.js';

/* یک سفارش نمونه با همان شکل سند مونگو — از جمله
   فیلدهایی که **نباید** به مشتری برسند. */
const sample = () => ({
  _id: '652f1c9a4b2e8a0012ab34cd',
  __v: 0,
  code: 'K7B2-4193',
  status: 'processing',
  createdAt: new Date('2026-05-01T08:30:00Z'),
  updatedAt: new Date('2026-05-02T10:00:00Z'),
  customer: {
    name: 'مریم احمدی',
    phone: '09121234567',
    address: 'تهران، خیابان کریم‌خان، پلاک ۱۲',
    note: 'بعد از ساعت ۵ تماس بگیرید'
  },
  lines: [
    {
      kind: 'coffee',
      slug: 'yirga',
      name: 'یرگاچف',
      unitPrice: 1850000,
      grams: 500,
      qty: 0,
      lineTotal: 925000,
      grind: 'v60',
      grindLabel: 'وی۶۰',
      mix: [{ slug: 'a', name: 'برزیل', percent: 60 }]
    }
  ],
  totals: {
    grams: 500,
    pieces: 0,
    base: 925000,
    discount: 0,
    discountLabel: '',
    shipping: 65000,
    total: 990000
  }
});

/* مدل ساختگی: فقط findOne(...).lean() لازم است */
function fakeOrders(docs) {
  return {
    calls: 0,
    findOne(filter) {
      this.calls += 1;
      const row = docs.find((d) => d.code === filter.code) || null;
      return { lean: async () => row };
    }
  };
}

describe('normalizePhone', () => {
  it('رقم فارسی و عربی را لاتین می‌کند', () => {
    expect(normalizePhone('۰۹۱۲۱۲۳۴۵۶۷')).toBe('09121234567');
    expect(normalizePhone('٠٩١٢١٢٣٤٥٦٧')).toBe('09121234567');
  });

  it('فاصله و خط تیره را نادیده می‌گیرد', () => {
    expect(normalizePhone('0912 123 4567')).toBe('09121234567');
    expect(normalizePhone('0912-123-4567')).toBe('09121234567');
  });

  it('پیش‌شمارهٔ کشور را به صفر برمی‌گرداند', () => {
    expect(normalizePhone('+989121234567')).toBe('09121234567');
    expect(normalizePhone('989121234567')).toBe('09121234567');
    expect(normalizePhone('00989121234567')).toBe('09121234567');
    expect(normalizePhone('9121234567')).toBe('09121234567');
  });

  it('ورودی خالی یا بی‌رقم، رشتهٔ خالی می‌دهد', () => {
    expect(normalizePhone('')).toBe('');
    expect(normalizePhone(null)).toBe('');
    expect(normalizePhone(undefined)).toBe('');
    expect(normalizePhone('سلام')).toBe('');
  });
});

describe('normalizeCode', () => {
  it('حروف کوچک و نبودِ خط تیره اشکالی ندارد', () => {
    expect(normalizeCode('k7b2-4193')).toBe('K7B2-4193');
    expect(normalizeCode('k7b24193')).toBe('K7B2-4193');
    expect(normalizeCode(' K7B2 4193 ')).toBe('K7B2-4193');
  });

  it('رقم فارسی هم پذیرفته می‌شود', () => {
    expect(normalizeCode('K7B2-۴۱۹۳')).toBe('K7B2-4193');
  });

  it('ورودی خالی، رشتهٔ خالی می‌دهد', () => {
    expect(normalizeCode('')).toBe('');
    expect(normalizeCode('---')).toBe('');
    expect(normalizeCode(undefined)).toBe('');
  });
});

describe('safeEqual', () => {
  it('برابرها را برابر و نابرابرها را نابرابر می‌بیند', () => {
    expect(safeEqual('09121234567', '09121234567')).toBe(true);
    expect(safeEqual('09121234567', '09121234568')).toBe(false);
  });

  it('طول‌های نابرابر خطا نمی‌دهند', () => {
    expect(safeEqual('a', 'abcdefghij')).toBe(false);
    expect(safeEqual('', 'x')).toBe(false);
    expect(safeEqual('', '')).toBe(true);
  });
});

describe('publicOrderView', () => {
  const view = publicOrderView(sample());

  it('آنچه مشتری لازم دارد هست', () => {
    expect(view.code).toBe('K7B2-4193');
    expect(view.status).toBe('processing');
    expect(view.createdAt).toBeInstanceOf(Date);
    expect(view.customer.name).toBe('مریم احمدی');
    expect(view.lines[0].name).toBe('یرگاچف');
    expect(view.lines[0].grindLabel).toBe('وی۶۰');
    expect(view.lines[0].mix[0]).toEqual({ name: 'برزیل', percent: 60 });
    expect(view.totals.total).toBe(990000);
  });

  /* ── مهم‌ترین تست این فایل ── */
  it('هیچ فیلد داخلی یا خصوصی‌ای بیرون نمی‌رود', () => {
    const flat = JSON.stringify(view);

    expect(view._id).toBeUndefined();
    expect(view.__v).toBeUndefined();
    expect(view.updatedAt).toBeUndefined();
    expect(view.customer.phone).toBeUndefined();
    expect(view.customer.address).toBeUndefined();
    expect(view.customer.note).toBeUndefined();

    /* حتی به‌شکل متنی هم نباید ردی از آن‌ها باشد */
    expect(flat).not.toContain('09121234567');
    expect(flat).not.toContain('کریم‌خان');
    expect(flat).not.toContain('بعد از ساعت');
    expect(flat).not.toContain('652f1c9a');
  });

  it('فیلد تازه‌ای که فردا به مدل اضافه شود، خودبه‌خود بیرون می‌ماند', () => {
    const withInternal = { ...sample(), adminNote: 'مشتری بدحساب', profitMargin: 42 };
    const flat = JSON.stringify(publicOrderView(withInternal));

    expect(flat).not.toContain('adminNote');
    expect(flat).not.toContain('بدحساب');
    expect(flat).not.toContain('profitMargin');
  });

  it('سفارش نصفه‌ونیمه سرور را نمی‌شکند', () => {
    const bare = publicOrderView({ code: 'X', status: 'new' });
    expect(bare.lines).toEqual([]);
    expect(bare.totals.total).toBe(0);
    expect(bare.customer.name).toBe('');
  });
});

describe('findOrderForTracking', () => {
  it('کد و شمارهٔ درست: سفارش برمی‌گردد', async () => {
    const model = fakeOrders([sample()]);
    const res = await findOrderForTracking({ code: 'K7B2-4193', phone: '09121234567' }, model);

    expect(res.status).toBe(200);
    expect(res.order.code).toBe('K7B2-4193');
    expect(res.error).toBeUndefined();
  });

  it('همان جفت با شکل دیگر تایپ هم کار می‌کند', async () => {
    const model = fakeOrders([sample()]);
    const res = await findOrderForTracking({ code: 'k7b2۴۱۹۳', phone: '+98 912 123 4567' }, model);

    expect(res.status).toBe(200);
    expect(res.order.code).toBe('K7B2-4193');
  });

  /* ── قاعدهٔ اصلی امنیت این مسیر ── */
  it('کد درست با شمارهٔ غلط، دقیقاً همان پاسخ کد ناموجود را می‌دهد', async () => {
    const model = fakeOrders([sample()]);

    const wrongPhone = await findOrderForTracking(
      { code: 'K7B2-4193', phone: '09350000000' },
      model
    );
    const noSuchCode = await findOrderForTracking(
      { code: 'ZZZZ-0000', phone: '09350000000' },
      model
    );

    expect(wrongPhone).toEqual(noSuchCode);
    expect(wrongPhone.status).toBe(404);
    expect(wrongPhone.error).toBe(NOT_FOUND_MESSAGE);
    /* و هیچ‌کدام تکه‌ای از سفارش را همراه خودشان ندارند */
    expect(wrongPhone.order).toBeUndefined();
  });

  it('حتی وقتی کد وجود ندارد هم پایگاه داده پرسیده می‌شود — تا زمان پاسخ لو ندهد', async () => {
    const model = fakeOrders([sample()]);
    await findOrderForTracking({ code: 'ZZZZ-0000', phone: '09121234567' }, model);
    expect(model.calls).toBe(1);
  });

  it('ورودی ناقص: ۴۰۰ با پیام راهنما، نه ۴۰۴', async () => {
    const model = fakeOrders([sample()]);

    for (const input of [
      { code: '', phone: '09121234567' },
      { code: 'K7B2-4193', phone: '' },
      { code: undefined, phone: undefined }
    ]) {
      const res = await findOrderForTracking(input, model);
      expect(res.status).toBe(400);
      expect(res.error).toContain('وارد کنید');
    }

    /* ورودی ناقص اصلاً به پایگاه داده نمی‌رسد */
    expect(model.calls).toBe(0);
  });

  it('شمارهٔ ذخیره‌شده با شکل دیگر هم جور می‌شود', async () => {
    const odd = sample();
    odd.customer.phone = '۰۹۱۲-۱۲۳-۴۵۶۷';

    const res = await findOrderForTracking(
      { code: 'K7B2-4193', phone: '09121234567' },
      fakeOrders([odd])
    );
    expect(res.status).toBe(200);
  });
});
