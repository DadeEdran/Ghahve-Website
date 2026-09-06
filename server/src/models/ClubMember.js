import mongoose from 'mongoose';

/* ══════════════════════════════════════════════════
   باشگاه مشتریان.
   عضویت ساده است: نام و شمارهٔ موبایل، و ایمیل اگر
   خودش بخواهد. رمز عبوری در کار نیست.
   شماره کلید یکتاست، پس یک نفر دو بار عضو نمی‌شود.
   ══════════════════════════════════════════════════ */

/* جدول schema — ستون‌ها عمداً هم‌ترازند */
// prettier-ignore
const clubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'نام را وارد کنید'],
      trim: true,
      minlength: [2, 'نام دست‌کم ۲ نویسه باشد'],
      maxlength: [80, 'نام خیلی بلند است']
    },

    phone: {
      type: String,
      required: [true, 'شمارهٔ موبایل را وارد کنید'],
      unique: true,
      trim: true,
      match: [/^0\d{10}$/, 'شمارهٔ موبایل باید ۱۱ رقم و با ۰ شروع شود']
    },

    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
      validate: {
        validator: (v) => v === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
        message: 'ایمیل معتبر نیست'
      }
    },

    /* علاقهٔ طعمی که موقع عضویت انتخاب کرده — برای پیشنهاد بهتر */
    taste: { type: String, default: '' },

    note:   { type: String, default: '', trim: true, maxlength: 400 },
    active: { type: Boolean, default: true }
  },
  {
    timestamps: true,
    toJSON: { transform(_d, ret) { delete ret.__v; return ret; } }
  }
);

clubSchema.index({ createdAt: -1 });

export const ClubMember = mongoose.model('ClubMember', clubSchema);
