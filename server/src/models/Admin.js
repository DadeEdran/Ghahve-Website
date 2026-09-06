import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/* ══════════════════════════════════════════════════
   حساب مدیر. رمز هیچ‌وقت خام ذخیره نمی‌شود؛ فقط هشِ
   bcrypt نگه داشته می‌شود و در پاسخ‌های API هم نمی‌آید.
   ══════════════════════════════════════════════════ */

const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'نام کاربری الزامی است'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'نام کاربری دست‌کم ۳ نویسه باشد']
    },
    passwordHash: { type: String, required: true, select: false },

    /* با تغییر رمز، این عدد جلو می‌رود و توکن‌های قدیمی
       به‌طور خودکار باطل می‌شوند. */
    tokenVersion: { type: Number, default: 0 }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_d, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      }
    }
  }
);

adminSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};

adminSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export const Admin = mongoose.model('Admin', adminSchema);
