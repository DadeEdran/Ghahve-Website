import { Router } from 'express';
import { Admin } from '../models/Admin.js';
import { signToken, requireAdmin } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimit.js';

const router = Router();

/* ── ورود ── */
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const username = String(req.body.username || '')
      .trim()
      .toLowerCase();
    const password = String(req.body.password || '');

    if (!username || !password) {
      return res.status(400).json({ error: 'نام کاربری و رمز را وارد کنید' });
    }

    const admin = await Admin.findOne({ username }).select('+passwordHash');

    /* پیام یکسان برای نام کاربری اشتباه و رمز اشتباه،
       تا نشود فهمید کدام نام کاربری وجود دارد. */
    const ok = admin && (await admin.checkPassword(password));
    if (!ok) {
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور درست نیست' });
    }

    res.json({ token: signToken(admin), admin: { username: admin.username } });
  } catch (err) {
    next(err);
  }
});

/* ── بررسی اعتبار نشست ── */
router.get('/me', requireAdmin, (req, res) => {
  res.json({ admin: { username: req.admin.username } });
});

/* ── تغییر رمز عبور (و در صورت نیاز نام کاربری) ── */
router.post('/change-password', requireAdmin, async (req, res, next) => {
  try {
    const current = String(req.body.currentPassword || '');
    const next_ = String(req.body.newPassword || '');
    const confirm = String(req.body.confirmPassword || '');
    const newUsername = req.body.newUsername
      ? String(req.body.newUsername).trim().toLowerCase()
      : null;

    const admin = await Admin.findById(req.admin._id).select('+passwordHash');

    if (!(await admin.checkPassword(current))) {
      return res.status(400).json({ error: 'رمز فعلی درست نیست' });
    }
    if (next_.length < 6) {
      return res.status(400).json({ error: 'رمز جدید دست‌کم ۶ نویسه باشد' });
    }
    if (next_ !== confirm) {
      return res.status(400).json({ error: 'رمز جدید و تکرارش یکی نیستند' });
    }
    if (next_ === current) {
      return res.status(400).json({ error: 'رمز جدید با رمز فعلی فرقی ندارد' });
    }

    if (newUsername && newUsername !== admin.username) {
      if (newUsername.length < 3) {
        return res.status(400).json({ error: 'نام کاربری دست‌کم ۳ نویسه باشد' });
      }
      const taken = await Admin.findOne({ username: newUsername, _id: { $ne: admin._id } });
      if (taken) {
        return res.status(400).json({ error: 'این نام کاربری قبلاً گرفته شده است' });
      }
      admin.username = newUsername;
    }

    await admin.setPassword(next_);
    admin.tokenVersion += 1; // توکن‌های قدیمی باطل می‌شوند
    await admin.save();

    /* توکن تازه برمی‌گردانیم تا کاربر از پنل بیرون نیفتد */
    res.json({
      ok: true,
      token: signToken(admin),
      admin: { username: admin.username },
      message: 'رمز عبور با موفقیت عوض شد'
    });
  } catch (err) {
    next(err);
  }
});

export default router;
