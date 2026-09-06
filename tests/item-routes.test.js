import { describe, it, expect } from 'vitest';
import {
  KIND_SEGMENT,
  SEGMENT_KIND,
  KIND_SEGMENTS,
  itemPath,
  itemUrl,
  absoluteUrl,
  normalizeBaseUrl
} from '@ghahve/shared/seo.js';
import { KINDS } from '@ghahve/shared/taxonomy.js';

/* ══════════════════════════════════════════════════
   مورد ۲۷ — هر کالا آدرس اختصاصی دارد.

   آنچه اینجا سنجیده می‌شود شکل خودِ آدرس است: نگاشت
   نوع کالا به بخش آدرس، و ساختنِ مسیر و آدرس مطلق.

   ── چه چیزی از این فایل رفت ──
   نیمهٔ دومش دربارهٔ «بازگشت به index.html» بود: در نسخهٔ
   ویت، Express هر آدرس ناشناخته را به SPA می‌داد و باید
   می‌سنجیدیم که /api و /uploads قربانی نشوند. با مهاجرت
   به Next (مورد ۲۶) آن بازگشت و lib/clientRoutes.js
   حذف شدند — Next خودش مسیرها را می‌شناسد و Express فقط
   API است. اینکه هر segment مسیر واقعی دارد را
   tests/next-routes.test.js نگه می‌دارد.
   ══════════════════════════════════════════════════ */

describe('نگاشت نوع کالا به بخش آدرس', () => {
  it('هر نوعِ taxonomy یک بخش آدرس دارد — نه یکی کم، نه یکی زیاد', () => {
    expect(Object.keys(KIND_SEGMENT).sort()).toEqual([...KINDS].sort());
    expect(KIND_SEGMENTS).toHaveLength(KINDS.length);
  });

  it('نگاشت برگشتی دقیقاً وارونهٔ رفت است', () => {
    for (const kind of KINDS) {
      expect(SEGMENT_KIND[KIND_SEGMENT[kind]]).toBe(kind);
    }
  });

  it('بخش‌های آدرس یکتا هستند', () => {
    expect(new Set(KIND_SEGMENTS).size).toBe(KIND_SEGMENTS.length);
  });
});

describe('itemPath', () => {
  it('قهوه، ابزار و پودر هرکدام مسیر خودشان را می‌گیرند', () => {
    expect(itemPath({ kind: 'coffee', slug: 'yirgacheffe' })).toBe('/coffee/yirgacheffe');
    expect(itemPath({ kind: 'gear', slug: 'hario-v60' })).toBe('/gear/hario-v60');
    expect(itemPath({ kind: 'powder', slug: 'matcha-ceremonial' })).toBe(
      '/powder/matcha-ceremonial'
    );
  });

  it('کالای ناقص به ریشه برمی‌گردد، نه به آدرس شکسته', () => {
    expect(itemPath({ kind: 'coffee' })).toBe('/');
    expect(itemPath({ slug: 'x' })).toBe('/');
    expect(itemPath(null)).toBe('/');
    expect(itemPath({ kind: 'unknown', slug: 'x' })).toBe('/');
  });

  it('هیچ‌وقت با / تمام نمی‌شود — canonical و sitemap باید یکی باشند', () => {
    const p = itemPath({ kind: 'coffee', slug: 'brazil' });
    expect(p.endsWith('/')).toBe(false);
    expect(p.startsWith('/')).toBe(true);
  });
});

describe('absoluteUrl و normalizeBaseUrl', () => {
  it('اسلشِ اضافهٔ انتهای آدرس پایه حذف می‌شود', () => {
    expect(normalizeBaseUrl('https://daneh.coffee/')).toBe('https://daneh.coffee');
    expect(normalizeBaseUrl('https://daneh.coffee///')).toBe('https://daneh.coffee');
    expect(normalizeBaseUrl('  https://daneh.coffee  ')).toBe('https://daneh.coffee');
    expect(normalizeBaseUrl(undefined)).toBe('');
  });

  it('هیچ‌وقت دو اسلش پشت‌سرهم نمی‌سازد', () => {
    expect(absoluteUrl('https://daneh.coffee/', '/coffee/x')).toBe('https://daneh.coffee/coffee/x');
    expect(absoluteUrl('https://daneh.coffee', 'coffee/x')).toBe('https://daneh.coffee/coffee/x');
  });

  it('بدون آدرس پایه، مسیر نسبی برمی‌گردد نه آدرس غلط', () => {
    expect(absoluteUrl('', '/track')).toBe('/track');
  });

  it('itemUrl همان itemPath است روی آدرس پایه', () => {
    expect(itemUrl('https://daneh.coffee', { kind: 'coffee', slug: 'brazil' })).toBe(
      'https://daneh.coffee/coffee/brazil'
    );
  });
});
