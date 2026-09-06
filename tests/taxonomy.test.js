/* ══════════════════════════════════════════════════
   کلیدهای دسته‌بندی، یکجا.

   pricing.js حالا واقعاً یک نسخه دارد و واگرایی‌اش
   ناممکن است. taxonomy اما نمی‌تواند کاملاً یکی شود:
   سرور فقط **کلید** لازم دارد و کلاینت کلید + **برچسب
   فارسی**، و بردن متن فارسی به لایهٔ مشترک یعنی سرور
   چیزی را حمل کند که هیچ‌وقت استفاده نمی‌کند.

   پس تقسیم شد: کلید در @ghahve/shared/taxonomy.js،
   برچسب در web/src/lib/groups.js — و این تست همان
   درزی را می‌پوشاند که از تقسیم می‌ماند: هر کلید باید
   دقیقاً یک برچسب داشته باشد، نه یکی کم و نه یکی زیاد.

   خطایی که می‌گیرد واقعی است: مدیر «سایفون» را در پنل
   انتخاب می‌کند، سرور ذخیره‌اش می‌کند، و کارت با نامِ
   خالی رندر می‌شود — چون جدول برچسب‌ها آن کلید را
   نداشته است.
   ══════════════════════════════════════════════════ */

import { describe, it, expect } from 'vitest';
import {
  KINDS as KIND_KEYS,
  GROUPS_BY_KIND,
  GEAR_SHAPES as GEAR_SHAPE_KEYS,
  GEAR_MATERIALS as GEAR_MATERIAL_KEYS,
  POWDER_SHAPES as POWDER_SHAPE_KEYS,
  POWDER_TONES as POWDER_TONE_KEYS,
  IS_WEIGHED,
  TASTE_KEYS,
  DEFAULT_GRINDS
} from '@ghahve/shared/taxonomy.js';
import {
  KINDS,
  KIND_ORDER,
  GROUPS,
  GROUP_ORDER,
  GEAR_GROUPS,
  GEAR_ORDER,
  POWDER_GROUPS,
  POWDER_ORDER,
  GEAR_SHAPES,
  GEAR_MATERIALS,
  POWDER_SHAPES,
  POWDER_TONES,
  TASTES,
  TASTE_ORDER,
  DEFAULT_GRINDS as CLIENT_GRINDS
} from '../web/src/lib/groups.js';

/* ترتیب در جدول برچسب اهمیت ندارد، اما مجموعه باید یکی باشد */
const sameKeys = (labelTable, keys) =>
  expect([...Object.keys(labelTable)].sort()).toEqual([...keys].sort());

describe('هر کلید مشترک یک برچسب فارسی دارد', () => {
  it('دسته‌های قهوه', () => sameKeys(GROUPS, GROUPS_BY_KIND.coffee));
  it('دسته‌های ابزار', () => sameKeys(GEAR_GROUPS, GROUPS_BY_KIND.gear));
  it('دسته‌های پودر', () => sameKeys(POWDER_GROUPS, GROUPS_BY_KIND.powder));
  it('طرح‌های ابزار', () => sameKeys(GEAR_SHAPES, GEAR_SHAPE_KEYS));
  it('جنس‌های ابزار', () => sameKeys(GEAR_MATERIALS, GEAR_MATERIAL_KEYS));
  it('طرح‌های پودر', () => sameKeys(POWDER_SHAPES, POWDER_SHAPE_KEYS));
  it('رنگ‌های پودر', () => sameKeys(POWDER_TONES, POWDER_TONE_KEYS));
  it('برچسب‌های طعمی', () => sameKeys(TASTES, TASTE_KEYS));
  it('نوع کالا', () => sameKeys(KINDS, KIND_KEYS));

  it('هیچ برچسبی خالی نیست', () => {
    for (const [name, table] of Object.entries({
      GEAR_SHAPES,
      GEAR_MATERIALS,
      POWDER_SHAPES,
      POWDER_TONES,
      TASTES
    })) {
      for (const [key, label] of Object.entries(table)) {
        expect(String(label).trim(), `${name}.${key}`).not.toBe('');
      }
    }
  });
});

describe('ترتیب‌های UI از shared می‌آیند، نه از یک کپی دوم', () => {
  it('همان آرایه است، نه آرایه‌ای شبیه آن', () => {
    /* toBe یعنی همان مرجع — اگر روزی کسی دوباره دستی
       بنویسدشان، این تست فوراً می‌شکند. */
    expect(KIND_ORDER).toBe(KIND_KEYS);
    expect(GROUP_ORDER).toBe(GROUPS_BY_KIND.coffee);
    expect(GEAR_ORDER).toBe(GROUPS_BY_KIND.gear);
    expect(POWDER_ORDER).toBe(GROUPS_BY_KIND.powder);
    expect(TASTE_ORDER).toBe(TASTE_KEYS);
    expect(CLIENT_GRINDS).toBe(DEFAULT_GRINDS);
  });

  it('واحد فروش هر نوع هم از shared می‌آید', () => {
    for (const kind of KIND_KEYS) {
      expect(KINDS[kind].weighed, kind).toBe(IS_WEIGHED[kind]);
    }
  });
});

describe('خودِ جدول کلیدها سالم است', () => {
  it('هر نوع کالا دسته‌های خودش را دارد', () => {
    for (const kind of KIND_KEYS) {
      expect(Array.isArray(GROUPS_BY_KIND[kind]), kind).toBe(true);
      expect(GROUPS_BY_KIND[kind].length, kind).toBeGreaterThan(0);
    }
  });

  it('هیچ کلیدی تکراری نیست', () => {
    const lists = {
      KIND_KEYS,
      GEAR_SHAPE_KEYS,
      GEAR_MATERIAL_KEYS,
      POWDER_SHAPE_KEYS,
      POWDER_TONE_KEYS,
      TASTE_KEYS,
      ...GROUPS_BY_KIND
    };
    for (const [name, list] of Object.entries(lists)) {
      expect(new Set(list).size, name).toBe(list.length);
    }
  });

  it('گزینه‌های آسیاب value و label دارند و value تکراری نیست', () => {
    const values = DEFAULT_GRINDS.map((g) => g.value);
    expect(new Set(values).size).toBe(values.length);
    for (const g of DEFAULT_GRINDS) {
      expect(g.value, JSON.stringify(g)).toBeTruthy();
      expect(String(g.label).trim(), g.value).not.toBe('');
    }
    /* دانهٔ کامل باید همیشه باشد: سرور وقتی مشتری چیزی
       نفرستد همین را پیش‌فرض می‌گیرد. */
    expect(values).toContain('whole');
  });
});
