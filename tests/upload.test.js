/* ══════════════════════════════════════════════════
   آپلود تصویر — مورد ۵ سند ضعف‌ها.

   دو ضمانت اینجا قفل می‌شود:

   ۱) SVG دیگر آپلود نمی‌شود. SVG یک سند XML است و
      می‌تواند <script> داشته باشد.
   ۲) هر چیزی که از /uploads سرو می‌شود — حتی فایل‌های
      قدیمی که پیش از این بسته‌شدن آپلود شده‌اند — با
      هدرهایی می‌آید که اجرا شدنش در مبدأ فروشگاه را
      ناممکن می‌کند.

   به دیسک و به مونگو دست نمی‌زنیم: fileFilter یک تابع
   با callback است و setUploadHeaders فقط روی res
   می‌نویسد، پس هر دو با بدل ساده تست می‌شوند.
   ══════════════════════════════════════════════════ */

import { describe, it, expect } from 'vitest';
import { ALLOWED, upload, setUploadHeaders } from '../server/src/lib/upload.js';

/* از میان‌افزار multer فقط fileFilter را صدا می‌زنیم */
const filter = (mimetype) =>
  new Promise((resolve) => {
    upload.fileFilter({}, { mimetype, originalname: 'x' }, (err, ok) =>
      resolve({ err, ok: ok === true })
    );
  });

/* پاسخ ساختگی — فقط setHeader را لازم داریم */
const fakeRes = () => ({
  headers: {},
  setHeader(k, v) {
    this.headers[k] = v;
  }
});

const headersFor = (file) => {
  const res = fakeRes();
  setUploadHeaders(res, file);
  return res.headers;
};

describe('فهرست نوع‌های مجاز', () => {
  it('SVG جزو نوع‌های مجاز نیست', () => {
    expect(ALLOWED['image/svg+xml']).toBeUndefined();
    expect(Object.values(ALLOWED)).not.toContain('.svg');
  });

  it('قالب‌های تصویر رَستری همچنان مجازند', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']) {
      expect(ALLOWED[type]).toBeTruthy();
    }
  });
});

describe('fileFilter', () => {
  it('SVG رد می‌شود، با پیام فارسی و بدون نام بردن از SVG', async () => {
    const { err, ok } = await filter('image/svg+xml');
    expect(ok).toBe(false);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('فقط تصویر');
    expect(err.message).not.toContain('SVG');
  });

  it('PNG می‌گذرد', async () => {
    const { err, ok } = await filter('image/png');
    expect(err).toBeNull();
    expect(ok).toBe(true);
  });

  it('نوع‌های غیرتصویری هم رد می‌شوند', async () => {
    for (const type of ['text/html', 'application/pdf', 'application/xml']) {
      const { ok } = await filter(type);
      expect(ok).toBe(false);
    }
  });
});

describe('هدرهای /uploads', () => {
  it('هر فایلی nosniff و CSP سندبَکس می‌گیرد', () => {
    const h = headersFor('/uploads/abc123.png');
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['Content-Security-Policy']).toContain("default-src 'none'");
    expect(h['Content-Security-Policy']).toContain('sandbox');
    expect(h['Cross-Origin-Resource-Policy']).toBe('same-origin');
    expect(h['X-Frame-Options']).toBe('DENY');
  });

  it('تصویر عادی دانلود اجباری نمی‌شود — وگرنه کارت‌ها می‌شکستند', () => {
    for (const f of ['a.png', 'b.JPG', 'c.webp', 'd.avif', 'e.gif']) {
      expect(headersFor(f)['Content-Disposition']).toBeUndefined();
    }
  });

  it('فایل سندی — از جمله SVG قدیمی — به دانلود تبدیل می‌شود', () => {
    for (const f of ['old.svg', 'OLD.SVG', 'x.svgz', 'y.xml', 'z.html', 'w.htm']) {
      expect(headersFor(f)['Content-Disposition']).toBe('attachment');
    }
  });

  it('مسیر خالی یا بی‌پسوند سرور را نمی‌شکند', () => {
    expect(() => headersFor('')).not.toThrow();
    expect(() => headersFor(undefined)).not.toThrow();
    expect(headersFor('README')['X-Content-Type-Options']).toBe('nosniff');
  });
});
