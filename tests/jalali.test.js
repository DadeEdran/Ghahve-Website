/* ══════════════════════════════════════════════════
   تقویم شمسی و بازه‌بندی گزارش‌ها.

   دو چیز اینجا حیاتی است: هفته باید از شنبه شروع شود،
   و مرزِ روز باید نیمه‌شبِ تهران باشد نه نیمه‌شبِ UTC —
   وگرنه سفارش‌های شبانه یک روز جابه‌جا می‌افتند.
   ══════════════════════════════════════════════════ */

import { describe, it, expect } from 'vitest';
import {
  JMONTHS,
  gregorianToJalali,
  jalaliToGregorian,
  toJalali,
  jalaliDateString,
  jalaliTimeString,
  jalaliDayStart,
  isPeriod,
  bucketOf,
  previousBucket,
  bucketSeries
} from '../server/src/lib/jalali.js';

/* روز هفته به وقت تهران — ۶ یعنی شنبه */
const tehranWeekday = (date) => {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tehran', weekday: 'short' }).format(
    date
  );
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p);
};

describe('تبدیل میلادی ↔ شمسی', () => {
  it('نوروز‌های شناخته‌شده', () => {
    expect(gregorianToJalali(2024, 3, 20)).toEqual({ jy: 1403, jm: 1, jd: 1 });
    expect(gregorianToJalali(2021, 3, 21)).toEqual({ jy: 1400, jm: 1, jd: 1 });
    expect(gregorianToJalali(2026, 3, 21)).toEqual({ jy: 1405, jm: 1, jd: 1 });
  });

  it('یک روز میانهٔ سال', () => {
    expect(gregorianToJalali(2026, 8, 12)).toEqual({ jy: 1405, jm: 5, jd: 21 });
  });

  it('روز آخر سال کبیسه', () => {
    /* ۱۴۰۳ کبیسه است: ۳۰ اسفند دارد */
    expect(gregorianToJalali(2025, 3, 20)).toEqual({ jy: 1403, jm: 12, jd: 30 });
  });

  it('رفت و برگشت، همان روز را می‌دهد', () => {
    for (const [gy, gm, gd] of [
      [2024, 3, 20],
      [2026, 8, 12],
      [2025, 1, 1],
      [2021, 12, 31]
    ]) {
      const j = gregorianToJalali(gy, gm, gd);
      expect(jalaliToGregorian(j.jy, j.jm, j.jd)).toEqual({ gy, gm: gm, gd });
    }
  });

  it('نام ماه‌ها کامل و به ترتیب است', () => {
    expect(JMONTHS).toHaveLength(12);
    expect(JMONTHS[0]).toBe('فروردین');
    expect(JMONTHS[11]).toBe('اسفند');
  });
});

describe('لحظه‌ها به وقت تهران بسته می‌شوند', () => {
  it('۲۱:۰۰ UTC یعنی فردا در تهران', () => {
    /* ۲۰۲۶-۰۸-۱۱ ساعت ۲۱:۰۰ UTC = ۲۰۲۶-۰۸-۱۲ ساعت ۰۰:۳۰ تهران */
    expect(toJalali(new Date('2026-08-11T21:00:00Z'))).toMatchObject({ jy: 1405, jm: 5, jd: 21 });
  });

  it('۱۹:۰۰ UTC هنوز همان روز است', () => {
    expect(toJalali(new Date('2026-08-11T19:00:00Z'))).toMatchObject({ jy: 1405, jm: 5, jd: 20 });
  });

  it('رشتهٔ تاریخ و ساعت با رقم لاتین، برای فایل خروجی', () => {
    const d = new Date('2026-08-12T09:00:00Z'); // ۱۲:۳۰ تهران
    expect(jalaliDateString(d)).toBe('1405/05/21');
    expect(jalaliTimeString(d)).toBe('12:30');
  });

  it('نیمه‌شبِ یک روز شمسی، واقعاً نیمه‌شبِ تهران است', () => {
    const start = jalaliDayStart(1405, 5, 21);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tehran',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }).format(start);
    expect(parts).toBe('00:00');
  });
});

describe('bucketOf — بازهٔ روز', () => {
  it('کلید و برچسب درست', () => {
    const b = bucketOf(new Date('2026-08-12T09:00:00Z'), 'day');
    expect(b.key).toBe('d:1405-05-21');
    expect(b.label).toBe('۲۱ مرداد ۱۴۰۵');
  });

  it('خودِ لحظه داخل بازه است و بازه دقیقاً یک روز است', () => {
    const d = new Date('2026-08-12T09:00:00Z');
    const b = bucketOf(d, 'day');
    expect(d.getTime()).toBeGreaterThanOrEqual(b.start.getTime());
    expect(d.getTime()).toBeLessThan(b.end.getTime());
    expect(b.end - b.start).toBe(86400000);
  });
});

describe('bucketOf — هفته از شنبه شروع می‌شود', () => {
  it('شنبه، شروعِ هفتهٔ خودش است', () => {
    /* ۲۰۲۶-۰۸-۰۸ شنبه است */
    const sat = new Date('2026-08-08T09:00:00Z');
    expect(tehranWeekday(sat)).toBe(6);
    const b = bucketOf(sat, 'week');
    expect(tehranWeekday(b.start)).toBe(6);
    expect(b.key).toBe('w:1405-05-17');
  });

  it('همهٔ روزهای یک هفته به یک سطل می‌افتند', () => {
    const keys = new Set();
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(Date.UTC(2026, 7, 8 + i, 9, 0, 0));
      keys.add(bucketOf(d, 'week').key);
    }
    expect([...keys]).toEqual(['w:1405-05-17']);
  });

  it('جمعه آخرین روز هفته است؛ شنبهٔ بعد سطل تازه می‌سازد', () => {
    const fri = new Date('2026-08-14T09:00:00Z');
    const nextSat = new Date('2026-08-15T09:00:00Z');
    expect(tehranWeekday(fri)).toBe(5);
    expect(tehranWeekday(nextSat)).toBe(6);
    expect(bucketOf(fri, 'week').key).toBe('w:1405-05-17');
    expect(bucketOf(nextSat, 'week').key).toBe('w:1405-05-24');
  });

  it('شروعِ هر هفته، برای صد هفتهٔ پیاپی، شنبه است', () => {
    let d = new Date('2026-08-12T09:00:00Z');
    for (let i = 0; i < 100; i += 1) {
      const b = bucketOf(d, 'week');
      expect(tehranWeekday(b.start)).toBe(6);
      expect(b.end - b.start).toBe(7 * 86400000);
      d = new Date(b.start.getTime() - 86400000);
    }
  });

  it('هفتهٔ روی مرز سال، هر دو ماه را در برچسب می‌آورد', () => {
    /* هفته‌ای که از ۲۶ اسفند ۱۴۰۲ شروع می‌شود و به فروردین ۱۴۰۳ می‌رسد */
    const b = bucketOf(new Date('2024-03-20T09:00:00Z'), 'week');
    expect(b.key).toBe('w:1402-12-26');
    expect(b.label).toContain('اسفند');
    expect(b.label).toContain('فروردین');
  });
});

describe('bucketOf — ماه و سال', () => {
  it('ماه از روز اول ماه شمسی شروع می‌شود', () => {
    const b = bucketOf(new Date('2026-08-12T09:00:00Z'), 'month');
    expect(b.key).toBe('m:1405-05');
    expect(b.label).toBe('مرداد ۱۴۰۵');
    expect(b.jd).toBe(1);
    expect(toJalali(b.start)).toMatchObject({ jy: 1405, jm: 5, jd: 1 });
  });

  it('اول فروردین در سطل فروردین می‌افتد، نه اسفند', () => {
    const nowruz = new Date('2026-03-21T09:00:00Z');
    expect(bucketOf(nowruz, 'day').key).toBe('d:1405-01-01');
    expect(bucketOf(nowruz, 'month').key).toBe('m:1405-01');
    expect(bucketOf(nowruz, 'year').key).toBe('y:1405');
  });

  it('آخرین لحظهٔ اسفند هنوز سالِ قبل است', () => {
    /* ۲۰۲۶-۰۳-۲۰ ساعت ۲۰:۰۰ UTC = ۲۳:۳۰ تهرانِ ۲۹ اسفند ۱۴۰۴ */
    const last = new Date('2026-03-20T20:00:00Z');
    expect(bucketOf(last, 'year').key).toBe('y:1404');
    expect(bucketOf(last, 'month').key).toBe('m:1404-12');
  });

  it('اسفند به فروردینِ سال بعد وصل می‌شود', () => {
    const b = bucketOf(new Date('2026-03-10T09:00:00Z'), 'month');
    expect(b.key).toBe('m:1404-12');
    expect(toJalali(b.end)).toMatchObject({ jy: 1405, jm: 1, jd: 1 });
  });

  it('سال، برچسب فارسی دارد', () => {
    expect(bucketOf(new Date('2026-08-12T09:00:00Z'), 'year').label).toBe('سال ۱۴۰۵');
  });
});

describe('previousBucket و bucketSeries', () => {
  it('بازهٔ قبلی دقیقاً به شروع بازهٔ فعلی می‌چسبد', () => {
    for (const period of ['day', 'week', 'month', 'year']) {
      const now = bucketOf(new Date('2026-08-12T09:00:00Z'), period);
      const prev = previousBucket(now, period);
      expect(prev.end.getTime()).toBe(now.start.getTime());
    }
  });

  it('سری از قدیم به جدید مرتب است و شکاف ندارد', () => {
    const list = bucketSeries('month', 14, new Date('2026-08-12T09:00:00Z'));
    expect(list).toHaveLength(14);
    expect(list[list.length - 1].key).toBe('m:1405-05');
    for (let i = 1; i < list.length; i += 1) {
      expect(list[i].start.getTime()).toBe(list[i - 1].end.getTime());
    }
  });

  it('سریِ هفتگی هم سرتاسر شنبه است', () => {
    for (const b of bucketSeries('week', 10, new Date('2026-08-12T09:00:00Z'))) {
      expect(tehranWeekday(b.start)).toBe(6);
    }
  });
});

describe('isPeriod', () => {
  it('فقط چهار بازهٔ شناخته‌شده را می‌پذیرد', () => {
    for (const p of ['day', 'week', 'month', 'year']) expect(isPeriod(p)).toBe(true);
    for (const p of ['hour', 'quarter', '', undefined]) expect(isPeriod(p)).toBe(false);
  });
});
