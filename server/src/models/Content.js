import mongoose from 'mongoose';

/* ══════════════════════════════════════════════════
   محتوای قابل ویرایش سایت.
   هر بخش یک کلید دارد و شکل دادهٔ خودش را — تا وقتی
   بخواهیم بخش تازه‌ای اضافه کنیم مجبور به مهاجرت
   پایگاه داده نشویم.

   کلیدها:
     about   → صفحهٔ دربارهٔ ما
     whyUs   → چرا از ما بخرید
     suggest → چه طعمی دوست دارید؟
     club    → باشگاه مشتریان
     grinds  → گزینه‌های آسیاب
     picks   → عنوان بخش پیشنهاد ما و پرفروش‌ها
     blends  → عنوان بخش میکس‌های ویژه
   ══════════════════════════════════════════════════ */

const contentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },

    /* ساختارش به کلید بستگی دارد؛ اعتبارسنجی شکل داده
       در لایهٔ مسیرها انجام می‌شود، نه اینجا. */
    data: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true,
    minimize: false,
    toJSON: {
      transform(_d, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const Content = mongoose.model('Content', contentSchema);

/* خواندن همهٔ بخش‌ها به شکل یک شیء ساده */
export async function loadContent() {
  const rows = await Content.find().lean();
  return Object.fromEntries(rows.map((r) => [r.key, r.data]));
}
