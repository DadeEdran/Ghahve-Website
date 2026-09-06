import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin.js';

export function signToken(admin) {
  const hours = Number(process.env.TOKEN_HOURS || 12);
  return jwt.sign({ sub: String(admin._id), v: admin.tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: `${hours}h`
  });
}

/* نگهبان مسیرهای مدیریتی.
   علاوه بر امضای توکن، شمارهٔ نسخه هم بررسی می‌شود تا
   با عوض شدن رمز، توکن‌های قبلی از کار بیفتند. */
export async function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'برای این کار باید وارد شوید' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(payload.sub);

    if (!admin) {
      return res.status(401).json({ error: 'حساب مدیر پیدا نشد' });
    }
    if (admin.tokenVersion !== payload.v) {
      return res.status(401).json({ error: 'رمز عوض شده است، دوباره وارد شوید' });
    }

    req.admin = admin;
    next();
  } catch {
    return res.status(401).json({ error: 'نشست شما منقضی شده است، دوباره وارد شوید' });
  }
}
