/* ══════════════════════════════════════════════════
   کلیدهای مجاز — تنها نسخه.

   مدل Item در سرور با همین‌ها اعتبارسنجی می‌شود تا
   هیچ‌وقت کالایی ذخیره نشود که طرح تصویرش وجود ندارد،
   و web/src/lib/groups.js برچسب فارسیِ هر کلید را
   کنارش می‌گذارد.

   تقسیم کار عمدی است: **کلید** اینجاست چون هر دو طرف
   باید یکی ببینندش؛ **برچسب فارسی** آنجاست چون فقط
   رابط کاربری به آن نیاز دارد و سرور کاری با متن ندارد.
   tests/taxonomy.test.js می‌سنجد که آن جدول برچسب‌ها
   دقیقاً همین کلیدها را پوشش بدهد — نه یکی کم، نه یکی
   زیاد.
   ══════════════════════════════════════════════════ */

export const KINDS = ['coffee', 'gear', 'powder'];

/* جدول دسته‌ها — کلیدها زیر هم خوانده می‌شوند */
// prettier-ignore
export const GROUPS_BY_KIND = {
  coffee: ['light', 'medium', 'dark', 'espresso', 'decaf'],
  gear:   ['pourover', 'stovetop', 'grinder', 'kettle', 'cups', 'barista'],
  powder: ['chocolate', 'matcha', 'masala', 'spice', 'milk', 'sweet']
};

/* هر سطر یک خانواده از ابزار است؛ گروه‌بندی معنا دارد */
// prettier-ignore
export const GEAR_SHAPES = [
  'dripper','chemex','wave','aeropress','frenchpress','immersion','siphon','tower',
  'moka','cezve','lever','machine','grinderHand','grinderElectric','sieve',
  'kettle','kettleBase','scale','thermo','refracto',
  'demitasse','cup','mug','glass','glassDouble','tumbler','bowl','server',
  'tamper','leveler','wdt','pitcher','knockbox','filters','canister','tablets'
];

export const GEAR_MATERIALS = [
  'steel',
  'alu',
  'black',
  'copper',
  'brass',
  'ceramic',
  'clay',
  'glass',
  'sage',
  'wood',
  'paper'
];

/* هر سطر یک خانواده از پودر است؛ گروه‌بندی معنا دارد */
// prettier-ignore
export const POWDER_SHAPES = [
  'scoop','chasen','sifterSmall','mug','jar','sachet','bar','cinnamonSticks',
  'podsGreen','nutmegSeed','gingerRoot','starAnise','vanillaPod','cubes'
];

/* هر سطر یک خانواده از رنگ‌هاست؛ گروه‌بندی معنا دارد */
// prettier-ignore
export const POWDER_TONES = [
  'cocoa','darkcocoa','white','matcha','matchaLight','hojicha','masala','cinnamon',
  'ginger','turmeric','cardamom','nutmeg','vanilla','milk','sugar','caramel'
];

/* واحد فروش هر نوع: قهوه و پودر وزنی، ابزار عددی */
export const IS_WEIGHED = { coffee: true, powder: true, gear: false };

/* ── نحوهٔ تحویل قهوه ──
   این‌ها پیش‌فرض‌اند؛ مدیر می‌تواند از بخش «محتوای سایت» عوض‌شان کند.
   هر ردیف سبد جداگانه یکی از این‌ها را می‌گیرد، پس مشتری می‌تواند
   یک قهوه را دانه کامل و قهوهٔ دیگر را آسیاب‌شده سفارش دهد. */
export const DEFAULT_GRINDS = [
  {
    value: 'whole',
    label: 'دانهٔ کامل (آسیاب نشود)',
    desc: 'تازگی بیشتر — خودتان موقع دم کردن آسیاب کنید'
  },
  { value: 'espresso', label: 'آسیاب اسپرسو', desc: 'خیلی ریز — برای پرتافیلتر و ماشین اسپرسو' },
  { value: 'moka', label: 'آسیاب موکاپات', desc: 'ریز تا متوسط — برای موکاپات روی شعله' },
  { value: 'v60', label: 'آسیاب وی۶۰ و کمکس', desc: 'متوسط — برای دم‌آوری دستی و قیف' },
  { value: 'aeropress', label: 'آسیاب ایروپرس', desc: 'متوسطِ ریز — برای ایروپرس' },
  { value: 'french', label: 'آسیاب فرنچ‌پرس', desc: 'درشت — برای فرنچ‌پرس و کلد برو' },
  { value: 'turkish', label: 'آسیاب ترک', desc: 'پودری — برای قهوهٔ ترک و قهوه‌جوش' }
];

/* پروفایل‌های طعمی — پایهٔ بخش «چه طعمی دوست دارید؟»
   کلیدها ثابت‌اند؛ متن و پیشنهادها در پنل مدیریت تغییر می‌کنند. */
export const TASTE_KEYS = [
  'sweet', // شیرین
  'fruity', // میوه‌ای
  'chocolate', // شکلاتی
  'nutty', // آجیلی
  'floral', // گل‌محمدی و عطری
  'spicy', // ادویه‌ای
  'bold', // پرقدرت و تلخ
  'smooth' // ملایم و کم‌اسید
];
