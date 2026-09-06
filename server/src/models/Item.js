import mongoose from 'mongoose';
import {
  KINDS,
  GROUPS_BY_KIND,
  GEAR_SHAPES,
  GEAR_MATERIALS,
  POWDER_SHAPES,
  POWDER_TONES,
  IS_WEIGHED,
  TASTE_KEYS
} from '@ghahve/shared/taxonomy.js';

/* یک جزء از میکس: کدام دانه و چند درصد.
   min/max بازه‌ای است که مشتری اجازه دارد درصد را در آن جابه‌جا کند. */
/* جدول schema — ستون‌ها عمداً هم‌ترازند */
// prettier-ignore
const componentSchema = new mongoose.Schema(
  {
    slug:    { type: String, required: true },
    percent: { type: Number, required: true, min: 0, max: 100 },
    min:     { type: Number, default: 0,   min: 0, max: 100 },
    max:     { type: Number, default: 100, min: 0, max: 100 },
    locked:  { type: Boolean, default: false }   // مشتری نمی‌تواند عوضش کند
  },
  { _id: false }
);

/* ══════════════════════════════════════════════════
   یک مدل واحد برای هر سه نوع کالا: قهوه، ابزار، پودر.
   تفاوت‌ها با فیلد kind مشخص می‌شود. یکی بودن مدل باعث
   می‌شود پنل مدیریت و مسیرهای API هم یکی باشند و جای
   کمتری برای اشتباه بماند.
   ══════════════════════════════════════════════════ */

/* جدول schema — ستون‌ها عمداً هم‌ترازند */
// prettier-ignore
const itemSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      required: [true, 'نوع کالا الزامی است'],
      enum: { values: KINDS, message: 'نوع کالا نامعتبر است' },
      index: true
    },

    /* شناسهٔ انگلیسی و یکتا — هم در آدرس‌ها استفاده می‌شود
       و هم بذر تولید تصویر کارت است، پس نباید تکراری باشد. */
    slug: {
      type: String,
      required: [true, 'شناسه الزامی است'],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^[a-z0-9][a-z0-9-]*$/, 'شناسه فقط می‌تواند حروف کوچک انگلیسی، عدد و خط تیره باشد']
    },

    name:   { type: String, required: [true, 'نام کالا الزامی است'], trim: true },
    origin: { type: String, default: '', trim: true },   // خاستگاه / جنس
    spec:   { type: String, default: '', trim: true },   // فرآوری / مشخصات فنی

    group: { type: String, required: [true, 'دسته الزامی است'], index: true },

    /* نوارِ پنج‌تایی روی کارت: درجهٔ رست / سطح مهارت / شدت طعم */
    meter: { type: Number, default: 3, min: [1, 'کمترین مقدار ۱ است'], max: [5, 'بیشترین مقدار ۵ است'] },

    /* قهوه و پودر: قیمت هر کیلوگرم — ابزار: قیمت هر عدد */
    price: {
      type: Number,
      required: [true, 'قیمت الزامی است'],
      min: [0, 'قیمت نمی‌تواند منفی باشد']
    },

    /* ── موجودی انبار ──
       واحدش همان واحد فروش است: گرم برای قهوه و پودر،
       عدد برای ابزار.

       null یعنی «نامحدود»، و پیش‌فرض هم همین است — چون
       تا پیش از این هیچ موجودی‌ای در کار نبود و همهٔ
       کالاهای موجود باید بدون مهاجرت مثل قبل کار کنند.
       صفر یعنی «تمام شد»، که با null یکی نیست. */
    stock: { type: Number, default: null, min: [0, 'موجودی نمی‌تواند منفی باشد'] },

    notes: { type: [String], default: [] },   // ویژگی‌های کوتاه زیر نام
    pairs: { type: [String], default: [] },   // «سازگار با» ابزار یا «پیشنهاد سرو» پودر
    tag:   { type: String, default: '', trim: true },   // برچسب گوشهٔ تصویر

    /* ظاهر تصویر تولیدی */
    shape: { type: String, default: '' },   // ابزار و پودر
    mat:   { type: String, default: '' },   // جنس ابزار
    tone:  { type: String, default: '' },   // رنگ پودر
    zoom:  { type: Number, default: 1, min: 0.4, max: 2 },

    /* اگر مدیر عکس واقعی آپلود کند، جای تصویر تولیدی می‌نشیند */
    image: { type: String, default: '' },

    rank:   { type: Number, default: 999 },   // ترتیب «پیشنهاد ما»
    active: { type: Boolean, default: true }, // خاموش = در سایت دیده نمی‌شود

    /* ── معرفی کامل کالا (پنجرهٔ «دربارهٔ این قهوه») ── */
    story:     { type: String, default: '', trim: true },   // این قهوه از کجا می‌آید
    taste:     { type: String, default: '', trim: true },   // در فنجان چه می‌چشید
    recommend: { type: String, default: '', trim: true },   // پیشنهاد ما برای دم کردنش

    /* برچسب‌های طعمی — پایهٔ بخش «چه طعمی دوست دارید؟» */
    tastes: {
      type: [String],
      default: [],
      validate: {
        validator: (v) => v.every((t) => TASTE_KEYS.includes(t)),
        message: 'برچسب طعمی نامعتبر است'
      }
    },

    /* ── میکس ── */
    isBlend:     { type: Boolean, default: false },   // این کالا از چند دانه ساخته شده
    house:       { type: Boolean, default: false },   // میکس ویژهٔ خانه (بخش جداگانه دارد)
    customizable:{ type: Boolean, default: false },   // مشتری می‌تواند درصدها را عوض کند
    components:  { type: [componentSchema], default: [] },
    pool:        { type: [String], default: [] },     // دانه‌هایی که مشتری می‌تواند اضافه کند
    surcharge:   { type: Number, default: 0, min: 0 },// هزینهٔ کار میکس، به ازای هر کیلو

    /* ── ویترین ── */
    featured:   { type: Boolean, default: false },   // در «پیشنهاد ما» بیاید
    pinnedTop:  { type: Boolean, default: false },   // به زور در «پرفروش‌ها» بیاید
    excludeTop: { type: Boolean, default: false },   // هیچ‌وقت در «پرفروش‌ها» نیاید

    /* قهوه‌ها آسیاب می‌شوند؛ پودر و ابزار نه */
    grindable: { type: Boolean, default: false }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

/* واحد فروش — سمت کاربر برای انتخاب گرم یا عدد لازم است */
itemSchema.virtual('weighed').get(function () {
  return IS_WEIGHED[this.kind] === true;
});

/* ── اعتبارسنجی وابسته به نوع ──
   دسته باید متعلق به همان نوع باشد، و شکل/جنس/رنگ باید
   جزو طرح‌های موجود باشند وگرنه کارت خالی رندر می‌شود. */
itemSchema.pre('validate', function (next) {
  const allowedGroups = GROUPS_BY_KIND[this.kind] || [];
  if (this.kind && !allowedGroups.includes(this.group)) {
    this.invalidate('group', `دستهٔ «${this.group}» برای این نوع کالا تعریف نشده است`);
  }

  if (this.kind === 'gear') {
    if (!this.shape) this.shape = 'mug';
    if (!GEAR_SHAPES.includes(this.shape)) this.invalidate('shape', 'طرح ابزار نامعتبر است');
    if (!this.mat) this.mat = 'steel';
    if (!GEAR_MATERIALS.includes(this.mat)) this.invalidate('mat', 'جنس ابزار نامعتبر است');
    this.tone = '';
  }

  if (this.kind === 'powder') {
    if (!this.shape) this.shape = 'scoop';
    if (!POWDER_SHAPES.includes(this.shape)) this.invalidate('shape', 'طرح پودر نامعتبر است');
    if (!this.tone) this.tone = 'cocoa';
    if (!POWDER_TONES.includes(this.tone)) this.invalidate('tone', 'رنگ پودر نامعتبر است');
    this.mat = '';
  }

  if (this.kind === 'coffee') {
    /* قهوه طرح اختصاصی ندارد؛ تصویرش از درجهٔ رست و دسته ساخته می‌شود */
    this.shape = '';
    this.mat = '';
    this.tone = '';
    this.pairs = [];
    this.grindable = true; // هر قهوه‌ای آسیاب‌شدنی است
  } else {
    /* فقط قهوه میکس می‌شود و آسیاب می‌خورد */
    this.grindable = false;
    this.isBlend = false;
    this.house = false;
    this.customizable = false;
    this.components = [];
    this.pool = [];
    this.surcharge = 0;
  }

  /* ── قواعد میکس ── */
  if (this.isBlend) {
    if (this.components.length < 2) {
      this.invalidate('components', 'یک میکس دست‌کم به دو دانه نیاز دارد');
    } else {
      const sum = this.components.reduce((s, c) => s + c.percent, 0);
      /* یک واحد رواداری، چون درصدها گرد می‌شوند */
      if (Math.abs(sum - 100) > 1) {
        this.invalidate('components', `مجموع درصدها باید ۱۰۰ باشد، الان ${Math.round(sum)} است`);
      }
      const seen = new Set();
      for (const c of this.components) {
        if (seen.has(c.slug)) {
          this.invalidate('components', `دانهٔ «${c.slug}» دو بار در میکس آمده است`);
        }
        seen.add(c.slug);
        if (c.min > c.max) {
          this.invalidate('components', 'کمینهٔ درصد نمی‌تواند از بیشینه بزرگ‌تر باشد');
        }
      }
    }
  } else {
    /* غیرمیکس نه جزء دارد، نه ویژهٔ خانه است */
    this.components = [];
    this.pool = [];
    this.customizable = false;
    this.house = false;
    this.surcharge = 0;
  }

  /* قیمت را گرد می‌کنیم تا اعشار سرگردان در پایگاه داده نماند */
  if (typeof this.price === 'number') this.price = Math.round(this.price);
  if (typeof this.meter === 'number') this.meter = Math.round(this.meter);

  /* موجودی هم همین‌طور — نیم گرم و نیم عدد معنا ندارد.
     مقایسهٔ اتمی هنگام ثبت سفارش روی همین عدد صحیح
     انجام می‌شود، پس اعشار فقط دردسر است. */
  if (typeof this.stock === 'number') this.stock = Math.max(0, Math.round(this.stock));

  next();
});

/* جست‌وجوی سریع در پنل مدیریت */
itemSchema.index({ kind: 1, rank: 1 });
itemSchema.index({ name: 'text', origin: 'text', spec: 'text' });

export const Item = mongoose.model('Item', itemSchema);
