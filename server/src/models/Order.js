import mongoose from 'mongoose';

/* ══════════════════════════════════════════════════
   سفارش‌ها. قیمت‌ها هنگام ثبت از روی پایگاه داده دوباره
   حساب می‌شوند (به عدد ارسالی از مرورگر اعتماد نمی‌کنیم)
   ولی همان لحظه در سفارش ذخیره می‌شوند تا تغییر قیمت
   بعدی، فاکتور قدیمی را عوض نکند.
   ══════════════════════════════════════════════════ */

/* ترکیب میکس، همان‌طور که مشتری سفارش داده —
   با نام دانه‌ها، تا فاکتور بعداً هم خوانا بماند. */
const mixSchema = new mongoose.Schema(
  { slug: String, name: String, percent: Number },
  { _id: false }
);

/* ستون‌های هم‌تراز عمدی‌اند: schema یک جدول است و کنار هم
   بودن نوع‌ها و پیش‌فرض‌ها خواندنش را آسان می‌کند. */
// prettier-ignore
const lineSchema = new mongoose.Schema(
  {
    kind:      { type: String, required: true },
    slug:      { type: String, required: true },
    name:      { type: String, required: true },
    unitPrice: { type: Number, required: true },   // هر کیلو یا هر عدد
    grams:     { type: Number, default: 0 },       // قهوه و پودر
    qty:       { type: Number, default: 0 },       // ابزار
    lineTotal: { type: Number, required: true },

    /* نحوهٔ تحویل همین ردیف — هر قهوه می‌تواند فرق کند */
    grind:      { type: String, default: '' },
    grindLabel: { type: String, default: '' },

    /* اگر میکس بوده، ترکیبش اینجا ثبت می‌شود */
    mix: { type: [mixSchema], default: [] }
  },
  { _id: false }
);

// prettier-ignore
const orderSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },

    lines: {
      type: [lineSchema],
      validate: [(v) => v.length > 0, 'سفارش بدون کالا ثبت نمی‌شود']
    },

    customer: {
      name:    { type: String, required: [true, 'نام گیرنده الزامی است'], trim: true },
      phone:   { type: String, required: [true, 'شمارهٔ تماس الزامی است'], trim: true },
      address: { type: String, required: [true, 'نشانی الزامی است'], trim: true },
      note:    { type: String, default: '', trim: true }
    },

    /* نحوهٔ تحویل روی خودِ ردیف‌ها ذخیره می‌شود، نه اینجا —
       چون مشتری می‌تواند هر قهوه را جور دیگری بخواهد. */

    totals: {
      grams:         { type: Number, default: 0 },
      pieces:        { type: Number, default: 0 },
      base:          { type: Number, default: 0 },
      discount:      { type: Number, default: 0 },
      discountLabel: { type: String, default: '' },
      shipping:      { type: Number, default: 0 },
      total:         { type: Number, default: 0 }
    },

    status: {
      type: String,
      enum: ['new', 'processing', 'done', 'canceled'],
      default: 'new',
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { transform(_d, ret) { delete ret.__v; return ret; } }
  }
);

/* ══════════════════════════════════════════════════
   ایندکس‌های گزارش‌ها.

   هر گزارشی که مدیر باز می‌کند، روی createdAt فیلتر یا
   مرتب می‌شود: خلاصهٔ بازه‌ای، فهرست صفحه‌بندی‌شده، و
   خروجی CSV و JSON. بدون ایندکس، هرکدام یک پیمایش کامل
   مجموعه است — با چند هزار سفارش کند می‌شود.

   ترتیب نزولی است چون همه‌جا «تازه‌ترین اول» می‌خواهیم.
   ایندکس دومی برای وقتی است که فیلتر وضعیت هم روی
   همان پرس‌وجو نشسته (مثل فهرست «سفارش‌های تازه»)،
   تا مونگو بتواند با یک ایندکس هم فیلتر و هم مرتب کند.
   ══════════════════════════════════════════════════ */
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

/* شمارهٔ کوتاه و خوانا برای سفارش، مثل ۴۰۵-۸۳۱۲ */
orderSchema.pre('validate', function (next) {
  if (!this.code) {
    const stamp = Date.now().toString(36).slice(-4).toUpperCase();
    const rand = Math.floor(Math.random() * 9000 + 1000);
    this.code = `${stamp}-${rand}`;
  }
  next();
});

export const Order = mongoose.model('Order', orderSchema);
