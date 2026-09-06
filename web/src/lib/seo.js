import {
  productJsonLd,
  organizationJsonLd,
  jsonLdText,
  itemUrl,
  absoluteUrl,
  itemImage,
  itemDescription,
  clamp,
  SITE_NAME,
  HOME_DESCRIPTION
} from '@ghahve/shared/seo.js';
import { KINDS, isSoldOut } from './groups.js';
import { toLatinDigits } from './format.js';
import { siteBaseUrl, siteOgImage } from './site.js';

/* ══════════════════════════════════════════════════
   داده‌های ساختاریافته.

   آنچه اینجاست فقط چیزی است که **فقط** رابط کاربری
   می‌داند: برچسب فارسی دستهٔ کالا (از groups.js)، وضعیت
   موجودی، و ساعتِ کارِ نوشته‌شده در پنل مدیریت.

   عنوان و توضیحِ صفحه اینجا نیستند و دوباره هم صادر
   نمی‌شوند — در shared/seo.js اند و هرکس همان‌جا صدایشان
   می‌زند. دلیلش بالای همان فایل آمده.

   قاعده هم عوض نشده: هیچ متنی دربارهٔ یک کالا دستی نوشته
   نمی‌شود، و برچسب فارسی دسته از groups.js می‌آید نه از
   shared (قاعدهٔ «کلید در shared، برچسب در groups.js»).
   ══════════════════════════════════════════════════ */

/* ── Product schema ──
   وضعیت موجودی از isSoldOut می‌آید، نه از یک مقایسهٔ تازه:
   «ناموجود» یعنی موجودی از کمینهٔ قابل‌خرید کمتر است و آن
   تعریف یک جا در groups.js زندگی می‌کند. */
export function productSchema(item, opts = {}) {
  const baseUrl = opts.baseUrl ?? siteBaseUrl();
  const kind = KINDS[item?.kind];

  return productJsonLd(item, {
    baseUrl,
    brandName: SITE_NAME,
    description: itemDescription(item),
    image: itemImage(item, siteOgImage(opts.env)),
    category: kind?.groups?.[item?.group]?.label || kind?.label || '',
    soldOut: isSoldOut(item),
    weighed: kind?.weighed === true
  });
}

/* ── ساعت کار ──
   در پنل مدیریت یک جملهٔ فارسی است
   («شنبه تا چهارشنبه ۱۰ تا ۲۰ · پنجشنبه ۱۰ تا ۱۶»)،
   ولی schema.org ساعت ماشین‌خوان می‌خواهد.

   به‌جای اینکه فیلد تازه‌ای به پنل اضافه کنیم و مدیر
   مجبور شود یک چیز را دو بار بنویسد، همان جمله پارس
   می‌شود. اگر شکلش را نشناسیم چیزی تولید نمی‌کنیم —
   ساعت غلط در داده‌های ساختاریافته از نبودنش بدتر است. */
const DAYS = [
  ['پنجشنبه', 'Thursday'],
  ['یکشنبه', 'Sunday'],
  ['دوشنبه', 'Monday'],
  ['سه‌شنبه', 'Tuesday'],
  ['سه شنبه', 'Tuesday'],
  ['چهارشنبه', 'Wednesday'],
  ['جمعه', 'Friday'],
  ['شنبه', 'Saturday']
];

/* هفتهٔ ایرانی از شنبه شروع می‌شود — همان ترتیبی که
   lib/jalali.js در سرور هم دارد. */
const WEEK = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/* «چهارشنبه» شامل «شنبه» است، پس ترتیب جدول از بلند به
   کوتاه چیده شده و اولین تطبیق برنده است. */
function dayOf(text) {
  const t = String(text || '').trim();
  for (const [fa, en] of DAYS) if (t.includes(fa)) return en;
  return '';
}

const hhmm = (h, m) => `${String(Number(h)).padStart(2, '0')}:${m ? m : '00'}`;

export function parseOpeningHours(text) {
  const raw = toLatinDigits(String(text || ''));
  if (!raw.trim()) return [];

  const out = [];

  for (const chunk of raw.split(/[·،,]/)) {
    const segment = chunk.trim();
    if (!segment) continue;

    /* ساعت‌ها همیشه ته جمله‌اند: «… ۱۰ تا ۲۰» */
    const time = /(\d{1,2})(?::(\d{2}))?\s*تا\s*(\d{1,2})(?::(\d{2}))?\s*$/.exec(segment);
    if (!time) continue;

    const opens = hhmm(time[1], time[2]);
    const closes = hhmm(time[3], time[4]);

    /* هرچه پیش از ساعت‌هاست، نام روزهاست */
    const dayPart = segment.slice(0, time.index).trim();
    const ends = dayPart
      .split(/\s+تا\s+/)
      .map(dayOf)
      .filter(Boolean);
    if (ends.length === 0) continue;

    let dayOfWeek;
    if (ends.length === 1) {
      dayOfWeek = [ends[0]];
    } else {
      /* بازهٔ «شنبه تا چهارشنبه» باز می‌شود، چون schema.org
         بازه نمی‌فهمد و فقط فهرست روز می‌گیرد. */
      const from = WEEK.indexOf(ends[0]);
      const to = WEEK.indexOf(ends[ends.length - 1]);
      if (from < 0 || to < 0 || to < from) continue;
      dayOfWeek = WEEK.slice(from, to + 1);
    }

    out.push({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: dayOfWeek.map((d) => `https://schema.org/${d}`),
      opens,
      closes
    });
  }

  return out;
}

/* ── LocalBusiness صفحهٔ اصلی ──
   نشانی، تلفن، ایمیل و ساعت کار همه از بخش «دربارهٔ ما»ی
   پنل مدیریت می‌آیند. اگر مدیر عوضشان کند، این هم عوض
   می‌شود — هیچ‌کدام اینجا ثابت نوشته نشده‌اند. */
export function organizationSchema(content = {}, opts = {}) {
  const baseUrl = opts.baseUrl ?? siteBaseUrl();
  const about = content?.about || {};

  return organizationJsonLd({
    baseUrl,
    name: SITE_NAME,
    description: clamp(about.lead || HOME_DESCRIPTION),
    image: about.image || siteOgImage(opts.env),
    logo: '/img/favicon.svg',
    streetAddress: about.address || '',
    addressLocality: about.address?.split('،')[0]?.trim() || '',
    telephone: about.phone ? toLatinDigits(about.phone) : '',
    email: about.email || '',
    openingHours: parseOpeningHours(about.hours),
    priceRange: '$$'
  });
}

/* ── چسباندن به صفحه ──
   خروجی مستقیم داخل <script> می‌نشیند و باید از
   jsonLdText رد شده باشد. */
export const asJsonLd = (schema) => (schema ? jsonLdText(schema) : '');

/** آدرس canonical یک کالا */
export const canonicalItemUrl = (item, baseUrl) => itemUrl(baseUrl ?? siteBaseUrl(), item);

/** آدرس canonical یک مسیر ساده */
export const canonicalUrl = (path, baseUrl) => absoluteUrl(baseUrl ?? siteBaseUrl(), path);
