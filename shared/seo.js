/* ══════════════════════════════════════════════════
   آدرس‌های عمومی کالاها — تنها نسخه.

   چرا در shared و نه در web؟ چون دو مصرف‌کننده دارد و
   باید دقیقاً یک آدرس بسازند:

   • وب با آن مسیر صفحه‌ها و لینک کارت‌ها را می‌سازد.
   • سرور با همان، sitemap.xml را می‌سازد.

   اگر دو نسخه می‌شد، روزی که بخش قهوه از /coffee به
   /beans می‌رفت، نقشهٔ سایت بی‌سروصدا به صفحه‌های ۴۰۴
   اشاره می‌کرد. پس مثل pricing.js، یک فایل مشترک.

   ── چرا اینجا متن فارسی هست، برخلاف قاعدهٔ ۶ ──
   قاعدهٔ ۶ می‌گوید برچسب فارسی سمت رابط کاربری می‌ماند
   چون «سرور کاری با متن ندارد». برای سئو درست نیست:
   عنوان و توضیحِ صفحهٔ کالا در نقشهٔ سایت و در متادیتای
   صفحه هر دو لازم‌اند، و دو نسخه شدنشان یعنی چیزی که در
   تلگرام دیده می‌شود با تبِ مرورگر فرق کند — همان
   دوگانگیِ pricing.js، این بار در متن.

   پس **مرز** این است: عنوان و توضیحِ صفحه (محتوا)
   اینجاست؛ برچسب‌های رابط کاربری — نام دسته‌ها، طعم‌ها،
   وضعیت سفارش — در web/src/lib/groups.js.

   ── یک تکه از تاریخ این فایل ──
   این مرز روزی کشیده شد که Express تگ‌های <head> صفحهٔ
   کالا را داخل index.html تزریق می‌کرد، چون خزندهٔ
   تلگرام و واتساپ جاوااسکریپت اجرا نمی‌کند. آن تزریق با
   مورد ۲۶ حذف شد — حالا Next خودش صفحه را روی سرور
   می‌سازد — ولی مرز سر جایش ماند و همچنان لازم است، چون
   sitemap.xml را همان Express می‌سازد.

   نگهبانش عوض شد: tests/next-metadata.test.js می‌سنجد که
   هرچه headTags تعریف می‌کند به متادیتای Next برسد.
   ══════════════════════════════════════════════════ */

import { KINDS } from './taxonomy.js';

/* بخش اول آدرس هر نوع کالا: /coffee/yirgacheffe
   کلید همان kind مدل Item است. عمداً انگلیسی است چون
   در URL می‌نشیند و باید بدون درصد-کدگذاری خوانا بماند. */
export const KIND_SEGMENT = {
  coffee: 'coffee',
  gear: 'gear',
  powder: 'powder'
};

/* راه برگشت: از بخش آدرس به kind. برای مسیریابی لازم است. */
export const SEGMENT_KIND = Object.fromEntries(
  Object.entries(KIND_SEGMENT).map(([kind, segment]) => [segment, kind])
);

/* همهٔ بخش‌های معتبر. در web هر segment یک پوشهٔ مسیر
   دارد و tests/next-routes.test.js می‌سنجد که هیچ‌کدام
   جا نمانده باشد — پس نوعِ تازه در taxonomy یادآوری
   می‌شود، نه بی‌صدا بی‌مسیر بماند. */
export const KIND_SEGMENTS = KINDS.map((k) => KIND_SEGMENT[k]).filter(Boolean);

/* مسیر نسبیِ یک کالا — همیشه با / شروع می‌شود و هیچ‌وقت
   با / تمام نمی‌شود، تا canonical و sitemap یکی دربیایند. */
export function itemPath(item) {
  const segment = KIND_SEGMENT[item?.kind];
  const slug = String(item?.slug || '').trim();
  if (!segment || !slug) return '/';
  return `/${segment}/${slug}`;
}

/* آدرس پایهٔ سایت از متغیر محیطی می‌آید و ممکن است با /
   تمام شده باشد یا فاصلهٔ اضافه داشته باشد. یک‌بار اینجا
   تمیز می‌شود تا هیچ‌جا آدرسِ دوخط‌تیره‌ای ساخته نشود. */
export function normalizeBaseUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  return s.replace(/\/+$/, '');
}

/* چسباندن مسیر به آدرس پایه. اگر پایه خالی باشد همان مسیر
   نسبی برمی‌گردد — در توسعه که SITE_URL تنظیم نشده، این
   بهتر از ساختن آدرسِ غلط است. */
export function absoluteUrl(baseUrl, path) {
  const base = normalizeBaseUrl(baseUrl);
  const p = String(path || '/');
  const rel = p.startsWith('/') ? p : `/${p}`;
  return base ? `${base}${rel}` : rel;
}

/* آدرس مطلق یک کالا — همان ترکیبی که هم canonical است،
   هم لینک sitemap، هم og:url. */
export const itemUrl = (baseUrl, item) => absoluteUrl(baseUrl, itemPath(item));

/* ══════════════════════════════════════════════════
   داده‌های ساختاریافته — JSON-LD (مورد ۲۸).

   همه‌چیز از خودِ سند کالا ساخته می‌شود؛ هیچ عددی و هیچ
   نامی اینجا ثابت نوشته نشده. `category` هنوز پارامتر
   است، چون برچسب دسته‌ها در groups.js است و
   آوردنش به اینجا یعنی دو نسخه شدنِ همان جدول — که دقیقاً
   همان چیزی است که مرزِ بالای فایل کنار گذاشتش.
   ══════════════════════════════════════════════════ */

/* ── واحد پول ──
   قیمت‌های پایگاه داده به **تومان** اند (money() هم همان
   را چاپ می‌کند)، ولی JSON-LD کد ISO 4217 می‌خواهد و کد
   رسمی ایران ریال است (IRR). «IRT» کد استانداردی نیست و
   گوگل ردش می‌کند.

   پس عدد ضرب در ۱۰ می‌شود تا چیزی که به موتور جست‌وجو
   می‌گوییم واقعاً همان مبلغ باشد. اگر روزی تصمیم گرفتید
   قیمت‌ها را به ریال ذخیره کنید، فقط همین ضریب را ۱ کنید. */
export const CURRENCY = 'IRR';
export const TOMAN_TO_RIAL = 10;

export const toRial = (toman) => Math.round(Number(toman) || 0) * TOMAN_TO_RIAL;

export const AVAILABILITY = {
  inStock: 'https://schema.org/InStock',
  outOfStock: 'https://schema.org/OutOfStock'
};

/* JSON را برای نشستن داخل <script> بی‌خطر می‌کند.

   textContent خودش HTML پارس نمی‌کند، ولی این رشته ممکن
   است روزی جای دیگری هم سرو شود. با تبدیل < و > و & به
   escape یونیکد، رشته‌ای می‌ماند که JSON.parse همان را
   می‌خواند ولی هیچ پارسر HTML ای نمی‌تواند تگ ببیند —
   پس نامِ کالایی مثل `</script><script>…` بی‌اثر است.

   U+2028 و U+2029 هم بسته می‌شوند: در JSON مجازند ولی در
   جاوااسکریپت پایان خط حساب می‌شوند. */
export function jsonLdText(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/* کلیدهای خالی را می‌اندازد تا خروجی پر از null و ""
   نشود — گوگل فیلد خالی را خطا می‌گیرد، نه «ندارد». */
const compact = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)
    )
  );

/**
 * Product schema یک کالا.
 *
 * @param item کالا، همان‌طور که از /api/items می‌آید
 * @param opts.baseUrl     آدرس پایهٔ سایت
 * @param opts.brandName   نام برند (فارسی، از groups/shared)
 * @param opts.description توضیح آمادهٔ فارسی
 * @param opts.image       آدرس تصویر (نسبی یا مطلق)
 * @param opts.category    برچسب فارسی دستهٔ کالا
 * @param opts.soldOut     نتیجهٔ isSoldOut — منطق موجودی
 *                         یک جا در groups.js است و اینجا
 *                         دوباره نوشته نمی‌شود
 * @param opts.weighed     کالای وزنی است؟ (قیمت هر کیلو)
 */
export function productJsonLd(item, opts = {}) {
  const { baseUrl = '', brandName = '', description = '', image = '', category = '' } = opts;
  const url = itemUrl(baseUrl, item);
  const price = toRial(item?.price);

  /* قیمت کالای وزنی «هر کیلو» است، نه «هر بسته». بدون این
     بند، گوگل ۱۸٬۵۰۰٬۰۰۰ ریال را قیمت یک کیسه می‌فهمد. */
  const priceSpecification = opts.weighed
    ? {
        '@type': 'UnitPriceSpecification',
        price: String(price),
        priceCurrency: CURRENCY,
        referenceQuantity: {
          '@type': 'QuantitativeValue',
          value: 1,
          unitCode: 'KGM' // کیلوگرم، کد UN/CEFACT
        }
      }
    : undefined;

  return compact({
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': url,
    name: String(item?.name || ''),
    description,
    image: image ? [absoluteUrl(baseUrl, image)] : undefined,
    sku: String(item?.slug || ''),
    category,
    url,
    brand: brandName ? { '@type': 'Brand', name: brandName } : undefined,
    offers: compact({
      '@type': 'Offer',
      url,
      price: String(price),
      priceCurrency: CURRENCY,
      priceSpecification,
      itemCondition: 'https://schema.org/NewCondition',
      availability: opts.soldOut ? AVAILABILITY.outOfStock : AVAILABILITY.inStock,
      seller: brandName ? { '@type': 'Organization', name: brandName } : undefined
    })
  });
}

/**
 * LocalBusiness صفحهٔ اصلی — که خودش زیرشاخهٔ Organization
 * است، پس یک گره هر دو کار را می‌کند.
 *
 * داده‌اش از بخش «دربارهٔ ما»ی پنل مدیریت می‌آید، نه از
 * متن ثابت: اگر مدیر نشانی را عوض کند، این هم عوض می‌شود.
 */
export function organizationJsonLd(opts = {}) {
  const {
    baseUrl = '',
    name = '',
    description = '',
    image = '',
    logo = '',
    streetAddress = '',
    addressLocality = '',
    telephone = '',
    email = '',
    openingHours = [],
    priceRange = ''
  } = opts;

  const url = absoluteUrl(baseUrl, '/');

  return compact({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${url}#business`,
    name,
    description,
    url,
    image: image ? absoluteUrl(baseUrl, image) : undefined,
    logo: logo ? absoluteUrl(baseUrl, logo) : undefined,
    telephone,
    email,
    priceRange,
    address: streetAddress
      ? compact({
          '@type': 'PostalAddress',
          streetAddress,
          addressLocality,
          addressCountry: 'IR'
        })
      : undefined,
    openingHoursSpecification: openingHours.length ? openingHours : undefined
  });
}

/* ══════════════════════════════════════════════════
   نقشهٔ سایت و robots (مورد ۲۹).

   sitemap.xml را **سرور** می‌سازد، نه فایل ایستایی در
   public/. دلیلش ساده است: فهرست کالاها هر روز عوض
   می‌شود و فایل ایستا از همان هفتهٔ اول کهنه می‌شد.
   ساختنش اینجاست تا بدون مونگو و بدون بالا آوردن
   Express تست شود.
   ══════════════════════════════════════════════════ */

const XML_ESCAPES = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' };

/* آدرس‌ها از slug ساخته می‌شوند و slug فقط حرف و رقم و
   خط تیره است، ولی آدرس پایه از متغیر محیطی می‌آید و
   می‌تواند هر چیزی باشد. پس همه‌چیز escape می‌شود. */
export const escapeXml = (s) => String(s ?? '').replace(/[<>&"']/g, (c) => XML_ESCAPES[c]);

/* تاریخ به شکلی که استاندارد sitemap می‌خواهد: YYYY-MM-DD.
   ورودی نامعتبر رشتهٔ خالی می‌دهد تا تگ lastmod اصلاً
   ساخته نشود — تاریخ غلط از نبود تاریخ بدتر است. */
export function lastmodOf(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

/**
 * XML نقشهٔ سایت.
 *
 * @param entries [{ path, lastmod, changefreq, priority }]
 * @param opts.baseUrl آدرس پایهٔ سایت
 */
export function buildSitemap(entries = [], opts = {}) {
  const base = normalizeBaseUrl(opts.baseUrl);

  const urls = entries
    .filter((e) => e && e.path)
    .map((e) => {
      const parts = [`    <loc>${escapeXml(absoluteUrl(base, e.path))}</loc>`];
      const lastmod = lastmodOf(e.lastmod);
      if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
      if (e.changefreq) parts.push(`    <changefreq>${escapeXml(e.changefreq)}</changefreq>`);
      if (e.priority !== undefined) {
        parts.push(`    <priority>${Number(e.priority).toFixed(1)}</priority>`);
      }
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

/* ردیف‌های نقشهٔ سایت از فهرست کالاهای روشن.

   کالای خاموش اینجا نمی‌آید — همان قاعده‌ای که
   GET /api/items دارد: چیزی که در فروشگاه دیده نمی‌شود
   نباید به گوگل هم معرفی شود. */
export function itemSitemapEntries(items = []) {
  return items
    .filter((it) => it && it.slug && KIND_SEGMENT[it.kind])
    .map((it) => ({
      path: itemPath(it),
      lastmod: it.updatedAt,
      changefreq: 'weekly',
      priority: 0.8
    }));
}

/**
 * متن robots.txt.
 *
 * پنل مدیریت و مسیرهای API بسته می‌شوند؛ /uploads عمداً
 * باز می‌ماند چون عکس واقعی کالاهاست و باید در جست‌وجوی
 * تصویر پیدا شود.
 */
export function buildRobots(opts = {}) {
  const base = normalizeBaseUrl(opts.baseUrl);
  const lines = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/',
    /* صفحهٔ پیگیری بدون «کد + موبایل» چیزی ندارد که
       ایندکس شود، و آدرس‌های ?code=… نباید در نتایج
       جست‌وجو بنشینند. */
    'Disallow: /track'
  ];

  if (base) lines.push('', `Sitemap: ${base}/sitemap.xml`);

  return `${lines.join('\n')}\n`;
}

/* ══════════════════════════════════════════════════
   متن صفحه — عنوان، توضیح و تصویر پیش‌نمایش.

   این‌ها روزی سمت رابط کاربری بودند. با آمدنِ تزریق سمت
   سرور (مورد ۲۹) هر دو طرف به همان رشته نیاز پیدا کردند،
   پس مثل pricing.js یکی شدند — و با رفتنِ آن تزریق
   (مورد ۲۶) هم اینجا ماندند، چون sitemap همچنان لازمشان
   دارد. دلیل کاملش بالای همین فایل آمده.

   قاعده عوض نشده: هیچ متنی دربارهٔ یک کالا دستی نوشته
   نمی‌شود. عنوان و توضیح از فیلدهای واقعی همان کالا
   ساخته می‌شوند تا اگر مدیر چیزی را عوض کرد، آنچه گوگل
   و تلگرام می‌بینند هم عوض شود.
   ══════════════════════════════════════════════════ */

export const SITE_NAME = 'رُست‌خانهٔ دانه';
export const SITE_LOCALE = 'fa_IR';
export const SITE_LANG = 'fa';
export const SITE_DIR = 'rtl';

/* عنوان و توضیح صفحهٔ اصلی. متادیتای پیش‌فرضِ همهٔ
   صفحه‌ها از همین‌ها ساخته می‌شود (app/layout.jsx)، پس
   هر مسیری که نسخهٔ خودش را نداشته باشد دست خالی
   نمی‌ماند. */
export const HOME_TITLE = 'رُست‌خانهٔ دانه — فروش قهوه تخصصی به گرم و کیلو';
export const HOME_DESCRIPTION =
  'بیش از ۳۰ خاستگاه و میکس، رست‌شدهٔ همین هفته. هر مقدار که بخواهید، از ۱۰۰ گرم تا چند کیلو.';

/* تصویر پیش‌فرض پیش‌نمایش لینک.

   تصویر کارت‌ها در مرورگر و به شکل SVG ساخته می‌شود، پس
   نه فایلی دارد که بشود آدرسش را داد و نه تلگرام و
   واتساپ SVG را رندر می‌کنند. برای همین یک تصویر ثابتِ
   رستری لازم است (npm run og:image می‌سازدش). */
export const DEFAULT_OG_IMAGE = '/img/og-default.png';

/* بیشترین طول توضیح متا. بلندتر از این را گوگل می‌بُرد،
   و بریدنِ خودمان بهتر از بریدنِ او وسط کلمه است. */
export const DESC_MAX = 158;

/** کوتاه کردن روی مرز کلمه، با سه‌نقطه */
export function clamp(text, max = DESC_MAX) {
  const s = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trim()}…`;
}

/* ── عنوان صفحهٔ کالا ──
   خاستگاه کنار نام می‌آید چون در نتایج جست‌وجو همان است
   که «یرگاچف» را از «یرگاچف» فروشندهٔ دیگر جدا می‌کند. */
export function itemTitle(item) {
  if (!item) return SITE_NAME;
  const head = [item.name, item.origin].filter(Boolean).join(' · ');
  return `${head} — ${SITE_NAME}`;
}

/* ── توضیح صفحهٔ کالا ──
   از فیلدهای واقعی ساخته می‌شود، به ترتیبِ اهمیت برای
   کسی که هنوز کالا را ندیده: مشخصات، نت‌های طعمی، و
   بعد متن معرفی اگر مدیر نوشته باشد. */
export function itemDescription(item) {
  if (!item) return HOME_DESCRIPTION;

  const spec = [item.origin, item.spec].filter(Boolean).join(' — ');
  const notes = (item.notes || []).filter(Boolean).join('، ');
  const prose = item.taste || item.story || item.recommend || '';

  const parts = [spec, notes ? `نت‌های ${notes}` : '', prose].filter(Boolean);

  /* کالایی که مدیر هنوز چیزی برایش ننوشته هم باید توضیحی
     داشته باشد، وگرنه گوگل خودش یک تکه از صفحه را
     برمی‌دارد و معمولاً بدترین تکه را برمی‌دارد.

     اینجا عمداً از برچسب دسته یا واحد فروش استفاده
     نمی‌شود: آن‌ها در groups.js اند و آوردنشان به shared
     یعنی دو نسخه شدنِ همان جدول. */
  if (parts.length === 0) return clamp(`${item.name} — ${SITE_NAME}`);

  return clamp(parts.join(' · '));
}

/** تصویر پیش‌نمایش این کالا — عکس آپلودی مدیر، وگرنه تصویر سایت */
export const itemImage = (item, ogImage = DEFAULT_OG_IMAGE) => item?.image || ogImage;

/* ══════════════════════════════════════════════════
   توصیفِ <head> یک صفحه، و تبدیلش به تگ.

   ── یک تعریف، یک مصرف‌کننده (و این تازه است) ──
   تا پیش از مورد ۲۶ دو مصرف‌کننده داشت و باید حرف‌به‌حرف
   یکی می‌ماندند: مرورگر آن‌ها را به عنصر DOM تبدیل می‌کرد
   و سرور به رشتهٔ HTML، تا داخل index.html تزریقشان کند.
   نگه داشتنِ آن دو همگام، خودش یک تستِ اختصاصی می‌خواست.

   حالا فقط یک جا مصرف می‌شود: web/src/lib/metadata.js
   همین توصیف را به شیء metadata نکست تبدیل می‌کند و Next
   رندرش می‌کند.

   ── پس چرا headTags هنوز اینجاست ──
   چون تعریفِ «چه چیزی باید در <head> باشد» است، حتی حالا
   که خودش رندر نمی‌کند. آداپتور در برابر همین سنجیده
   می‌شود (tests/next-metadata.test.js): هر مقداری که
   headTags می‌سازد باید در خروجی metadata پیدا شود.
   بی‌این، افتادنِ یک تگ هیچ خطایی تولید نمی‌کرد — فقط
   پیش‌نمایش لینک در تلگرام بی‌تصویر می‌شد.
   ══════════════════════════════════════════════════ */

/** توصیف <head> صفحهٔ یک کالا */
export function itemHeadState(item, opts = {}) {
  const { baseUrl = '', ogImage = DEFAULT_OG_IMAGE } = opts;

  return {
    title: itemTitle(item),
    description: itemDescription(item),
    canonical: itemUrl(baseUrl, item),
    ogType: 'product',
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    /* og:image باید مطلق باشد؛ نسبی را هیچ‌کدام از
       پیش‌نمایش‌سازها دنبال نمی‌کنند. */
    image: absoluteUrl(baseUrl, itemImage(item, ogImage)),
    imageAlt: String(item?.name || '')
  };
}

/**
 * توصیف <head> برای آدرس کالایی که وجود ندارد.
 *
 * دو حالت به اینجا می‌رسند و عمداً یکی دیده می‌شوند:
 * شناسه‌ای که هیچ‌وقت نبوده، و کالایی که مدیر خاموشش کرده.
 * از بیرون فرقی ندارند — هیچ‌کدام «الان فروخته نمی‌شود».
 *
 * سه چیزی که اینجا **نیست** به‌اندازهٔ آنچه هست مهم است:
 *
 * • canonical — صفحه‌ای که وجود ندارد نسخهٔ متعارف ندارد.
 * • og:image و og:url — پیش‌نمایشِ لینکی که به بن‌بست
 *   می‌رسد نباید تصویر و آدرس تبلیغاتی داشته باشد.
 * • description — چیزی برای توصیف نیست، و noindex هم
 *   می‌گوید اصلاً ایندکس نشود.
 *
 * نام فروشگاه و زبان می‌مانند تا کارت پیش‌نمایش بی‌هویت
 * نباشد.
 */
export function notFoundHeadState() {
  return {
    title: `کالا پیدا نشد — ${SITE_NAME}`,
    /* follow نه noindex تنها: لینک‌های داخل صفحه (بازگشت
       به فروشگاه) همچنان ارزش خزیدن دارند. */
    robots: 'noindex, follow',
    siteName: SITE_NAME,
    locale: SITE_LOCALE
  };
}

/* ── ساختن فهرست تگ‌ها از توصیفِ صفحه ──
   خروجی عمداً دادهٔ ساده است تا هم بشود بدون DOM سنجیدش
   و هم هر دو طرف یک‌جور مصرفش کنند. */
export function headTags(state = {}) {
  const tags = [];

  const meta = (key, attr, content) => {
    if (content) tags.push({ tag: 'meta', attrs: { [attr]: key, content: String(content) } });
  };

  meta('description', 'name', state.description);
  meta('robots', 'name', state.robots);

  /* Open Graph — چیزی که تلگرام و واتساپ می‌خوانند */
  meta('og:type', 'property', state.ogType);
  meta('og:site_name', 'property', state.siteName);
  meta('og:locale', 'property', state.locale);
  meta('og:title', 'property', state.ogTitle || state.title);
  meta('og:description', 'property', state.ogDescription || state.description);
  meta('og:url', 'property', state.canonical);
  meta('og:image', 'property', state.image);
  meta('og:image:alt', 'property', state.imageAlt);

  /* توییتر تگ‌های خودش را می‌خواهد وگرنه به کارت ساده
     برمی‌گردد؛ عنوان و توضیح را از OG برمی‌دارد ولی
     نوع کارت را نه. */
  meta('twitter:card', 'name', state.image ? 'summary_large_image' : 'summary');
  meta('twitter:title', 'name', state.ogTitle || state.title);
  meta('twitter:description', 'name', state.ogDescription || state.description);
  meta('twitter:image', 'name', state.image);

  if (state.canonical) {
    tags.push({ tag: 'link', attrs: { rel: 'canonical', href: state.canonical } });
  }

  for (const json of state.jsonLd || []) {
    if (json) tags.push({ tag: 'script', attrs: { type: 'application/ld+json' }, text: json });
  }

  return tags;
}

/* شناسهٔ یکتای یک تگ head — همان چیزی که «تکراری بودن»
   با آن سنجیده می‌شود. برای meta نامش (name یا property)
   و برای link نوع رابطه‌اش. */
export const identityOf = (tag, attrs) =>
  `${tag}|${attrs.property || attrs.name || attrs.rel || ''}`;

/** فهرست شناسهٔ تگ‌هایی که یک صفحه می‌نویسد */
export const headIdentities = (state) => headTags(state).map((t) => identityOf(t.tag, t.attrs));
