/* ══════════════════════════════════════════════════
   محدودیت نرخ باید در محیط تست خاموش باشد.

   وگرنه هر مجموعه‌تستی که روزی مسیر ورود یا ثبت سفارش
   را چند بار صدا بزند، از ششمین بار به بعد ۴۲۹ می‌گیرد
   و تست‌ها بی‌دلیل قرمز می‌شوند. این تست همان ضمانت را
   قفل می‌کند.
   ══════════════════════════════════════════════════ */

import { describe, it, expect, beforeAll } from 'vitest';
import { loginLimiter, orderLimiter, trackLimiter } from '../server/src/middleware/rateLimit.js';

/* درخواست و پاسخ ساختگی — فقط همان چیزی که میان‌افزار لمس می‌کند */
const fakeReq = () => ({
  ip: '203.0.113.7',
  ips: [],
  method: 'POST',
  headers: {},
  socket: { remoteAddress: '203.0.113.7' },
  app: { get: () => false }
});

const fakeRes = () => {
  const res = {
    statusCode: 200,
    headers: {},
    finished: false,
    setHeader(k, v) {
      this.headers[k] = v;
    },
    getHeader(k) {
      return this.headers[k];
    },
    removeHeader(k) {
      delete this.headers[k];
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      this.finished = true;
      return this;
    },
    send(body) {
      this.body = body;
      this.finished = true;
      return this;
    },
    end() {
      this.finished = true;
      return this;
    },
    on() {}
  };
  return res;
};

/* چند بار پشت‌سرهم از میان‌افزار رد می‌شویم و می‌شماریم
   که چند بار اجازهٔ عبور داده است */
const runThrough = async (limiter, times) => {
  let passed = 0;
  for (let i = 0; i < times; i += 1) {
    await new Promise((resolve) => {
      limiter(fakeReq(), fakeRes(), () => {
        passed += 1;
        resolve();
      });
      /* اگر میان‌افزار جلوی درخواست را بگیرد، next صدا
         نمی‌شود؛ پس با یک تیک بعدی از انتظار درمی‌آییم. */
      setTimeout(resolve, 0);
    });
  }
  return passed;
};

describe('محدودیت نرخ در محیط تست', () => {
  beforeAll(() => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('ورود مدیر: خیلی بیشتر از سقف ۵ تایی هم عبور می‌کند', async () => {
    expect(await runThrough(loginLimiter, 25)).toBe(25);
  });

  it('ثبت سفارش: همین‌طور', async () => {
    expect(await runThrough(orderLimiter, 25)).toBe(25);
  });

  it('پیگیری سفارش: همین‌طور', async () => {
    expect(await runThrough(trackLimiter, 30)).toBe(30);
  });
});
