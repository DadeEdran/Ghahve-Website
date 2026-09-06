/* ══════════════════════════════════════════════════
   تقویم شمسی، بدون وابستگی بیرونی.

   گزارش‌ها باید با تقویمی دسته‌بندی شوند که مدیر
   می‌بیند: «مرداد» یعنی مرداد، نه August. پس بازه‌ها
   روی تقویم جلالی بسته می‌شوند، نه میلادی.

   الگوریتم تبدیل، همان روش شناخته‌شدهٔ jalaali است
   (دقیق تا سال ۳۱۷۷).
   ══════════════════════════════════════════════════ */

/* ایران از سال ۱۴۰۱ ساعت تابستانی ندارد و اختلافش با
   UTC همیشه ۳:۳۰ است — ولی سفارش‌های قدیمی‌تر ممکن است
   از دورهٔ ساعت تابستانی (۴:۳۰) باشند. پس به‌جای عددِ
   ثابت، اختلاف واقعیِ همان لحظه را از خود سیستم
   می‌پرسیم تا هیچ سفارشی یک روز جابه‌جا نیفتد. */
const TEHRAN = 'Asia/Tehran';
const FALLBACK_OFFSET_MIN = 210;

const tzFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TEHRAN,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

/* لحظه را به وقت تهران می‌شکند */
function zoned(date) {
  const p = {};
  for (const part of tzFormat.formatToParts(date)) {
    if (part.type !== 'literal') p[part.type] = Number(part.value);
  }
  /* ساعت ۲۴ در برخی نسخه‌ها یعنی نیمه‌شب */
  if (p.hour === 24) p.hour = 0;
  return p;
}

/* اختلاف تهران با UTC در یک لحظهٔ مشخص، به دقیقه */
function offsetMinAt(date) {
  try {
    const p = zoned(date);
    const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    return Math.round((asUTC - date.getTime()) / 60000);
  } catch {
    return FALLBACK_OFFSET_MIN;
  }
}

/* شش‌ماه اول و دوم سال، هر کدام یک سطر */
// prettier-ignore
export const JMONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

const DAY_MS = 86400000;
const div = (a, b) => Math.trunc(a / b);

/* برچسب‌ها با رقم فارسی نوشته می‌شوند تا کنار بقیهٔ
   عددهای پنل یکدست باشند. رقم لاتین فقط در فایل خروجی
   می‌ماند، چون اکسل باید عدد را بشناسد. */
const faDigits = (v) => String(v).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

/* ── هستهٔ تبدیل ── */

function jalCal(jy) {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 1701, 1866, 2020, 2620, 3220, 3628
  ];
  const bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jm, jump, leap, n;

  if (jy < jp || jy >= breaks[bl - 1]) throw new Error('Jalaali year out of range: ' + jy);

  for (let i = 1; i < bl; i += 1) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(jump % 33, 4);
    jp = jm;
  }

  n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div((n % 33) + 3, 4);
  if (jump % 33 === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  leap = (((n + 1) % 33) - 1) % 4;
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

/* شمارهٔ روز ژولیَن — پلِ بین دو تقویم */
function g2d(gy, gm, gd) {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * ((gm + 9) % 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(j % 1461, 4) * 5 + 308;
  const gd = div(i % 153, 5) + 1;
  const gm = (div(i, 153) % 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

export function gregorianToJalali(gy, gm, gd) {
  const { jy, jm, jd } = d2jInternal(g2d(gy, gm, gd));
  return { jy, jm, jd };
}

function d2jInternal(jdn) {
  let gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;

  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: (k % 31) + 1 };
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + div(k, 30), jd: (k % 30) + 1 };
}

export function jalaliToGregorian(jy, jm, jd) {
  const r = jalCal(jy);
  const jdn = g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  return d2g(jdn);
}

/* ── لحظه‌ها ── */

/* تاریخ میلادیِ همان لحظه، به وقت تهران */
export function tehranParts(date) {
  const p = zoned(date);
  return {
    gy: p.year,
    gm: p.month,
    gd: p.day,
    hh: p.hour,
    mi: p.minute,
    /* روز هفته را از خودِ تاریخِ محلی می‌گیریم، نه از لحظه */
    weekday: new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay() // ۰ = یکشنبه
  };
}

/* نیمه‌شب تهرانِ یک روز میلادی، به‌صورت لحظهٔ واقعی (UTC).
   دو بار تصحیح می‌کنیم تا اگر آن روز مرزِ ساعت تابستانی
   بوده هم به نیمه‌شبِ درست برسیم. */
function tehranMidnight(gy, gm, gd) {
  const naive = Date.UTC(gy, gm - 1, gd);
  let t = naive - FALLBACK_OFFSET_MIN * 60000;
  for (let i = 0; i < 2; i += 1) t = naive - offsetMinAt(new Date(t)) * 60000;
  return new Date(t);
}

/* نیمه‌شب تهرانِ یک روز شمسی */
export function jalaliDayStart(jy, jm, jd) {
  const g = jalaliToGregorian(jy, jm, jd);
  return tehranMidnight(g.gy, g.gm, g.gd);
}

/* تاریخ شمسی یک لحظه، به وقت تهران */
export function toJalali(date) {
  const p = tehranParts(date);
  return { ...gregorianToJalali(p.gy, p.gm, p.gd), hh: p.hh, mi: p.mi };
}

const pad = (n) => String(n).padStart(2, '0');

/* «۱۴۰۵/۰۵/۲۰» — برای فایل خروجی، با رقم لاتین تا اکسل
   آن را متن ببیند و به‌هم نریزد. */
export function jalaliDateString(date) {
  const j = toJalali(date);
  return `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`;
}

export function jalaliTimeString(date) {
  const j = toJalali(date);
  return `${pad(j.hh)}:${pad(j.mi)}`;
}

/* ── بازه‌ها ── */

const PERIODS = new Set(['day', 'week', 'month', 'year']);
export const isPeriod = (p) => PERIODS.has(p);

/* بازه‌ای که یک لحظه در آن می‌افتد.
   هفته از شنبه شروع می‌شود، مثل تقویم ایران. */
export function bucketOf(date, period) {
  const p = tehranParts(date);

  if (period === 'day') {
    const j = gregorianToJalali(p.gy, p.gm, p.gd);
    return makeBucket('day', j.jy, j.jm, j.jd);
  }

  if (period === 'week') {
    /* getUTCDay: ۰ یکشنبه … ۶ شنبه. فاصله تا شنبهٔ قبل: */
    const back = (p.weekday + 1) % 7;
    const sat = new Date(Date.UTC(p.gy, p.gm - 1, p.gd) - back * DAY_MS);
    const j = gregorianToJalali(sat.getUTCFullYear(), sat.getUTCMonth() + 1, sat.getUTCDate());
    return makeBucket('week', j.jy, j.jm, j.jd);
  }

  if (period === 'month') {
    const j = gregorianToJalali(p.gy, p.gm, p.gd);
    return makeBucket('month', j.jy, j.jm, 1);
  }

  const j = gregorianToJalali(p.gy, p.gm, p.gd);
  return makeBucket('year', j.jy, 1, 1);
}

function makeBucket(period, jy, jm, jd) {
  const start = jalaliDayStart(jy, jm, jd);
  let end, key, label;

  if (period === 'day') {
    end = new Date(start.getTime() + DAY_MS);
    key = `d:${jy}-${pad(jm)}-${pad(jd)}`;
    label = `${faDigits(jd)} ${JMONTHS[jm - 1]} ${faDigits(jy)}`;
  } else if (period === 'week') {
    end = new Date(start.getTime() + 7 * DAY_MS);
    const last = toJalali(new Date(end.getTime() - DAY_MS));
    key = `w:${jy}-${pad(jm)}-${pad(jd)}`;
    label =
      jm === last.jm
        ? `${faDigits(jd)} تا ${faDigits(last.jd)} ${JMONTHS[jm - 1]} ${faDigits(jy)}`
        : `${faDigits(jd)} ${JMONTHS[jm - 1]} تا ${faDigits(last.jd)} ${JMONTHS[last.jm - 1]} ${faDigits(last.jy)}`;
  } else if (period === 'month') {
    const nm = jm === 12 ? 1 : jm + 1;
    const ny = jm === 12 ? jy + 1 : jy;
    end = jalaliDayStart(ny, nm, 1);
    key = `m:${jy}-${pad(jm)}`;
    label = `${JMONTHS[jm - 1]} ${faDigits(jy)}`;
  } else {
    end = jalaliDayStart(jy + 1, 1, 1);
    key = `y:${jy}`;
    label = `سال ${faDigits(jy)}`;
  }

  return { key, label, start, end, jy, jm, jd };
}

/* بازهٔ قبلیِ همان جنس — برای ساختن فهرست بازه‌ها به عقب */
export function previousBucket(bucket, period) {
  return bucketOf(new Date(bucket.start.getTime() - DAY_MS), period);
}

/* فهرست بازه‌ها، از قدیم به جدید، شاملِ بازه‌های خالی */
export function bucketSeries(period, count, now = new Date()) {
  const list = [];
  let b = bucketOf(now, period);
  for (let i = 0; i < count; i += 1) {
    list.unshift(b);
    b = previousBucket(b, period);
  }
  return list;
}
