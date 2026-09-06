/* ══════════════════════════════════════════════════
   دسته‌بندی‌ها — برچسب فارسیِ کلیدهای مشترک.

   تقسیم کار با @ghahve/shared/taxonomy.js عمدی است:

   • **کلید** آنجاست، چون سرور و کلاینت باید یکی
     ببینندش. مدل Item با همان‌ها اعتبارسنجی می‌کند.
   • **برچسب فارسی** اینجاست، چون فقط رابط کاربری به
     آن نیاز دارد و سرور کاری با متن ندارد.

   پس ترتیب‌ها (KIND_ORDER, GROUP_ORDER, …) را از shared
   می‌گیریم نه اینکه دوباره بنویسیم؛ و tests/taxonomy.test.js
   می‌سنجد که جدول‌های برچسب دقیقاً همان کلیدها را پوشش
   بدهند — نه یکی کم، نه یکی زیاد.
   ══════════════════════════════════════════════════ */

import {
  KINDS as KIND_KEYS,
  GROUPS_BY_KIND,
  IS_WEIGHED,
  TASTE_KEYS,
  DEFAULT_GRINDS
} from '@ghahve/shared/taxonomy.js';

export { DEFAULT_GRINDS };

/* جدول برچسب‌ها — منبع حقیقتِ UI، ستون‌به‌ستون */
// prettier-ignore
export const GROUPS = {
  light:    { label: 'رست روشن',      short: 'روشن',   desc: 'اسیدیتهٔ زنده، نوت‌های میوه و گل — برای دم‌آوری دستی' },
  medium:   { label: 'رست متوسط',     short: 'متوسط',  desc: 'تعادل شیرینی و اسیدیته — همه‌کاره و بی‌دردسر' },
  dark:     { label: 'رست تیره',      short: 'تیره',   desc: 'بدنهٔ سنگین، کاکائو و ادویه — موکاپات و فرنچ‌پرس' },
  espresso: { label: 'میکس و اسپرسو', short: 'اسپرسو', desc: 'ترکیب‌های کارگاه برای شات و قهوهٔ شیری' },
  decaf:    { label: 'بدون کافئین',   short: 'دیکف',   desc: 'کافئین‌زدایی با آب — طعم می‌ماند، بی‌خوابی نه' }
};

export const GROUP_ORDER = GROUPS_BY_KIND.coffee;

/* جدول برچسب‌ها — منبع حقیقتِ UI، ستون‌به‌ستون */
// prettier-ignore
export const GEAR_GROUPS = {
  pourover: { label:'دم‌آور دستی',              short:'دم‌آور',      desc:'قیف، کمکس، ایروپرس و فرنچ‌پرس — قهوهٔ فیلتری خانگی' },
  stovetop: { label:'موکاپات و اسپرسوساز',      short:'اسپرسوساز',   desc:'از موکاپات روی شعله تا ماشین تک‌گروپِ کافه' },
  grinder:  { label:'آسیاب',                    short:'آسیاب',       desc:'دستی و برقی، تیغهٔ مخروطی و تخت — قلب هر فنجان' },
  kettle:   { label:'کتری و ابزار اندازه‌گیری', short:'کتری و ترازو', desc:'گردن‌غازی، ترازوی دقیق، دماسنج و تی‌دی‌اس‌متر' },
  cups:     { label:'فنجان و ماگ',              short:'فنجان',       desc:'از دمی‌تاسِ اسپرسو تا ماگ سفری و کاسهٔ کاپینگ' },
  barista:  { label:'ابزار بار و نگهداری',      short:'ابزار بار',   desc:'تمپر، پیچر، ناک‌باکس، فیلتر کاغذی و قوطی خلأ' }
};

export const GEAR_ORDER = GROUPS_BY_KIND.gear;

/* جدول برچسب‌ها — منبع حقیقتِ UI، ستون‌به‌ستون */
// prettier-ignore
export const POWDER_GROUPS = {
  chocolate: { label:'شکلات داغ و کاکائو', short:'شکلات', desc:'از شکلات داغ غلیظ تا کاکائوی خالصِ تاپینگ' },
  matcha:    { label:'ماچا و چای پودری',   short:'ماچا',   desc:'ماچای ژاپنی درجه‌بندی‌شده و هوجیچای برشته' },
  masala:    { label:'ماسالا و چای ادویه',  short:'ماسالا', desc:'چای ماسالا، کرک و لاتهٔ زردچوبه' },
  spice:     { label:'ادویه و تاپینگ',      short:'ادویه',  desc:'دارچین، هل، وانیل و جوز — تازه آسیاب‌شده' },
  milk:      { label:'شیر و کریمر پودری',   short:'شیر',    desc:'شیرخشک، کریمر گیاهی و پودر خامه' },
  sweet:     { label:'شیرین‌کننده و طعم',   short:'شیرینی', desc:'شکر دمرارا، کارامل، وانیل و پایهٔ فراپه' }
};

export const POWDER_ORDER = GROUPS_BY_KIND.powder;

/* ---------- نگاشت نوع کالا ---------- */
/* هر سه نوع کالا در یک مدل واحد ذخیره می‌شوند و فقط
   برچسب‌ها و واحدشان فرق می‌کند. این جدول همان تفاوت‌هاست. */

export const KINDS = {
  coffee: {
    label: 'قهوه',
    groups: GROUPS,
    order: GROUP_ORDER,
    weighed: IS_WEIGHED.coffee, // به گرم فروخته می‌شود
    weights: [100, 250, 500, 1000],
    defaultWeight: 250,
    step: 100,
    minWeight: 100,
    meterLabel: 'درجهٔ رست',
    sortLow: 'روشن‌ترین رست',
    sortHigh: 'تیره‌ترین رست',
    meterClass: '',
    priceLabel: 'هر کیلو',
    pairsLabel: null // قهوه فهرست «سازگار با» ندارد
  },
  gear: {
    label: 'ابزار',
    groups: GEAR_GROUPS,
    order: GEAR_ORDER,
    weighed: IS_WEIGHED.gear, // عددی فروخته می‌شود
    weights: [],
    defaultWeight: 0,
    step: 1,
    minWeight: 1,
    meterLabel: 'سطح مهارت لازم',
    sortLow: 'ساده‌ترین',
    sortHigh: 'حرفه‌ای‌ترین',
    meterClass: 'level-bar',
    priceLabel: 'قیمت هر عدد',
    pairsLabel: 'سازگار با'
  },
  powder: {
    label: 'پودر',
    groups: POWDER_GROUPS,
    order: POWDER_ORDER,
    weighed: IS_WEIGHED.powder,
    weights: [50, 100, 250, 500],
    defaultWeight: 100,
    step: 50,
    minWeight: 50,
    meterLabel: 'شدت طعم',
    sortLow: 'ملایم‌ترین',
    sortHigh: 'پرطعم‌ترین',
    meterClass: 'taste-bar',
    priceLabel: 'هر کیلو',
    pairsLabel: 'پیشنهاد سرو'
  }
};

export const KIND_ORDER = KIND_KEYS;

/* ---------- موجودی انبار ---------- */
/* واحدِ شمارش با واحد فروش یکی است: گرم برای وزنی، عدد
   برای ابزار. سرور هم دقیقاً همین را کم می‌کند. */

/** null یعنی نامحدود — پس صفر و null را نباید یکی گرفت */
export const isTracked = (item) => typeof item?.stock === 'number';

/** «۷۵۰ گرم» یا «۳ عدد» */
export function stockText(item) {
  if (!isTracked(item)) return 'نامحدود';
  const unit = KINDS[item.kind]?.weighed === false ? 'عدد' : 'گرم';
  return `${Number(item.stock).toLocaleString('fa-IR')} ${unit}`;
}

/** کمترین مقداری که می‌شود از این کالا خرید */
export const minBuyable = (item) =>
  KINDS[item.kind]?.weighed === false ? 1 : (KINDS[item.kind]?.minWeight ?? 100);

/** موجودی حتی برای کمترین خرید هم کافی نیست */
export const isSoldOut = (item) => isTracked(item) && item.stock < minBuyable(item);

/* ---------- وضعیت سفارش ---------- */
/* کلیدها با enum مدل Order در سرور یکی هستند. هم صفحهٔ
   «سفارش‌ها» و هم «گزارش‌ها» از همین یک جا می‌خوانند. */

/* جدول برچسب‌ها — منبع حقیقتِ UI، ستون‌به‌ستون */
// prettier-ignore
export const ORDER_STATUS = {
  new:        'تازه',
  processing: 'در حال آماده‌سازی',
  done:       'تحویل شده',
  canceled:   'لغو شده'
};

export const ORDER_STATUS_ORDER = ['new', 'processing', 'done', 'canceled'];

/* ---------- پروفایل‌های طعمی ---------- */
/* کلیدها از shared می‌آیند. متن پیشنهادها در پنل مدیریت
   («چه طعمی دوست دارید») عوض می‌شود؛ این‌ها فقط برچسب
   کوتاه برای کارت کالا و فرم مدیریت‌اند. */

/* جدول برچسب‌ها — منبع حقیقتِ UI، ستون‌به‌ستون */
// prettier-ignore
export const TASTES = {
  sweet:     'شیرین',
  fruity:    'میوه‌ای',
  chocolate: 'شکلاتی',
  nutty:     'آجیلی',
  floral:    'عطری',
  spicy:     'ادویه‌ای',
  bold:      'پرقدرت',
  smooth:    'ملایم'
};

export const TASTE_ORDER = TASTE_KEYS;

/* ---------- گزینه‌های ظاهری کارت ---------- */
/* این‌ها دقیقاً کلیدهای موجود در lib/art.js هستند.
   در پنل مدیریت به‌صورت فهرست کشویی نمایش داده می‌شوند تا
   هیچ‌وقت شکلی انتخاب نشود که طرحش وجود ندارد. */

export const GEAR_SHAPES = {
  dripper: 'قیف مخروطی',
  chemex: 'کمکس',
  wave: 'کالیتا ویو',
  aeropress: 'ایروپرس',
  frenchpress: 'فرنچ‌پرس',
  immersion: 'دریپر ایمرشن',
  siphon: 'سایفون',
  tower: 'برج کلد برو',
  moka: 'موکاپات',
  cezve: 'قهوه‌جوش دسته‌دار',
  lever: 'اسپرسوساز اهرمی',
  machine: 'ماشین اسپرسو',
  grinderHand: 'آسیاب دستی',
  grinderElectric: 'آسیاب برقی',
  sieve: 'الک دانه',
  kettle: 'کتری گردن‌غازی',
  kettleBase: 'کتری با پایه',
  scale: 'ترازو',
  thermo: 'دماسنج',
  refracto: 'تی‌دی‌اس‌متر',
  demitasse: 'فنجان دمی‌تاس',
  cup: 'فنجان',
  mug: 'ماگ',
  glass: 'لیوان شیشه‌ای',
  glassDouble: 'لیوان دوجداره',
  tumbler: 'ماگ سفری',
  bowl: 'کاسهٔ کاپینگ',
  server: 'سرور شیشه‌ای',
  tamper: 'تمپر',
  leveler: 'لولر',
  wdt: 'ابزار دبلیودی‌تی',
  pitcher: 'پیچر شیر',
  knockbox: 'ناک‌باکس',
  filters: 'فیلتر کاغذی',
  canister: 'قوطی خلأ',
  tablets: 'قرص شوینده'
};

export const GEAR_MATERIALS = {
  steel: 'استیل',
  alu: 'آلومینیوم',
  black: 'مشکی مات',
  copper: 'مس',
  brass: 'برنج',
  ceramic: 'سرامیک',
  clay: 'سفال',
  glass: 'شیشه',
  sage: 'سبز مریمی',
  wood: 'چوب',
  paper: 'کاغذ'
};

export const POWDER_SHAPES = {
  scoop: 'پیمانه',
  chasen: 'همزن ماچا',
  sifterSmall: 'الک کوچک',
  mug: 'ماگ',
  jar: 'شیشهٔ درب‌دار',
  sachet: 'ساشه',
  bar: 'قالب',
  cinnamonSticks: 'چوب دارچین',
  podsGreen: 'غلاف هل',
  nutmegSeed: 'جوز هندی',
  gingerRoot: 'ریشهٔ زنجبیل',
  starAnise: 'بادیان',
  vanillaPod: 'غلاف وانیل',
  cubes: 'حبه'
};

export const POWDER_TONES = {
  cocoa: 'کاکائو',
  darkcocoa: 'کاکائوی تلخ',
  white: 'سفید',
  matcha: 'ماچا',
  matchaLight: 'ماچای روشن',
  hojicha: 'هوجیچا',
  masala: 'ماسالا',
  cinnamon: 'دارچین',
  ginger: 'زنجبیل',
  turmeric: 'زردچوبه',
  cardamom: 'هل',
  nutmeg: 'جوز',
  vanilla: 'وانیل',
  milk: 'شیر',
  sugar: 'شکر',
  caramel: 'کارامل'
};
