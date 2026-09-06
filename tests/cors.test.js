/* ══════════════════════════════════════════════════
   CORS نباید در تولید بی‌صدا باز بماند.

   خطرناک‌ترین حالت این است: کسی CLIENT_ORIGIN را در
   سرور تولید تنظیم نکند، سرور بالا بیاید، همه‌چیز درست
   به‌نظر برسد — و API برای هر مبدأیی باز باشد. این تست
   همان حالت را می‌بندد.
   ══════════════════════════════════════════════════ */

import { describe, it, expect } from 'vitest';
import { resolveCorsOrigin, parseOrigins } from '../server/src/lib/cors.js';

describe('parseOrigins', () => {
  it('فهرست جدا‌شده با کاما را می‌شکند و فاصله‌ها را می‌گیرد', () => {
    expect(parseOrigins('https://a.com, https://b.com')).toEqual([
      'https://a.com',
      'https://b.com'
    ]);
  });

  it('رشتهٔ خالی و undefined هر دو یعنی «تنظیم‌نشده»', () => {
    expect(parseOrigins('')).toEqual([]);
    expect(parseOrigins(undefined)).toEqual([]);
    /* کاماهای بی‌مقدار نباید مبدأ خالی بسازند */
    expect(parseOrigins(' , , ')).toEqual([]);
  });
});

describe('resolveCorsOrigin', () => {
  it('در تولید بدون CLIENT_ORIGIN خطا می‌دهد', () => {
    expect(() => resolveCorsOrigin({ NODE_ENV: 'production' })).toThrow(/CLIENT_ORIGIN/);
    expect(() => resolveCorsOrigin({ NODE_ENV: 'production', CLIENT_ORIGIN: '' })).toThrow(
      /CLIENT_ORIGIN/
    );
  });

  it('در تولید با CLIENT_ORIGIN همان فهرست را می‌دهد', () => {
    expect(
      resolveCorsOrigin({ NODE_ENV: 'production', CLIENT_ORIGIN: 'https://daneh.coffee' })
    ).toEqual(['https://daneh.coffee']);
  });

  it('در توسعه بدون تنظیم، باز می‌ماند تا کلونِ تازه بدون .env کار کند', () => {
    expect(resolveCorsOrigin({ NODE_ENV: 'development' })).toBe(true);
    expect(resolveCorsOrigin({})).toBe(true);
  });

  it('در توسعه هم اگر تنظیم شده باشد، محدود می‌شود', () => {
    expect(resolveCorsOrigin({ CLIENT_ORIGIN: 'http://localhost:3000' })).toEqual([
      'http://localhost:3000'
    ]);
  });
});
