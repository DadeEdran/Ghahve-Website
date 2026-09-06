import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* تصویرهای آپلودی کنار سرور می‌مانند و از /uploads سرو می‌شوند */
export const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ══════════════════════════════════════════════════
   SVG عمداً در این فهرست نیست (مورد ۵ سند ضعف‌ها).

   SVG یک سند XML است، نه یک تصویر خام: می‌تواند
   <script> داشته باشد. و چون از /uploads روی همان
   دامنهٔ سایت سرو می‌شود، آن اسکریپت در مبدأ خودِ
   فروشگاه اجرا می‌شد — یعنی به توکن مدیر در
   localStorage هم دسترسی داشت.

   تصویرهای برداری خودِ سایت (public/img) از این راه
   نمی‌آیند و دست‌نخورده‌اند؛ این فهرست فقط دربارهٔ
   چیزی است که مدیر از پنل آپلود می‌کند.
   ══════════════════════════════════════════════════ */
export const ALLOWED = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif'
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    /* نام تصادفی — نام اصلی فایل ممکن است فارسی یا تکراری باشد */
    const ext = ALLOWED[file.mimetype] || path.extname(file.originalname).toLowerCase() || '.bin';
    cb(null, crypto.randomBytes(12).toString('hex') + ext);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 }, // ۴ مگابایت
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED[file.mimetype]) {
      return cb(new Error('فقط تصویر JPG، PNG، WebP، AVIF یا GIF قابل آپلود است'));
    }
    cb(null, true);
  }
});

/* ══════════════════════════════════════════════════
   هدرهای پوشهٔ /uploads.

   بستن فهرست مجاز فقط جلوی آپلودِ **تازه** را می‌گیرد.
   هر چیزی که پیش از این آپلود شده هنوز روی دیسک است و
   سرو می‌شود، پس لایهٔ دوم لازم است: حتی اگر فایلی
   بتواند خودش را سند اجرایی جا بزند، مرورگر نباید
   اجرایش کند.

   • nosniff  — مرورگر حق ندارد نوع فایل را از محتوایش
     حدس بزند. یک PNG با محتوای HTML، همان PNG می‌ماند.
   • CSP سخت‌گیر — CSP سراسری helmet برای صفحهٔ فروشگاه
     تنظیم شده ('self' برای اسکریپت). اینجا بازنویسی‌اش
     می‌کنیم: default-src 'none' یعنی این سند حق هیچ
     درخواستی ندارد، و sandbox آن را در مبدأ یکتا و
     بدون اسکریپت می‌گذارد. یعنی SVG قدیمیِ آلوده هم
     دیگر به مبدأ فروشگاه دسترسی ندارد.
   • Content-Disposition: attachment روی پسوندهای سندی —
     باز کردن مستقیم /uploads/x.svg به‌جای رندر، دانلود
     می‌شود. (روی <img src> اثری ندارد، پس تصویرهای
     عادی سالم می‌مانند.)
   • CORP: same-origin — سایت دیگری نمی‌تواند این فایل‌ها
     را به منابع خودش وصل کند.
   ══════════════════════════════════════════════════ */

/* پسوندهایی که مرورگر می‌تواند به‌جای تصویر، «سند» ببیندشان */
const DOCUMENT_LIKE = new Set(['.svg', '.svgz', '.xml', '.html', '.htm', '.xhtml']);

export function setUploadHeaders(res, filePath) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');

  if (DOCUMENT_LIKE.has(path.extname(String(filePath || '')).toLowerCase())) {
    res.setHeader('Content-Disposition', 'attachment');
  }
}
