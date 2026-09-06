import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';

import { connectDB } from './db.js';
import authRoutes from './routes/auth.js';
import itemRoutes from './routes/items.js';
import orderRoutes from './routes/orders.js';
import contentRoutes from './routes/content.js';
import clubRoutes from './routes/club.js';
import statsRoutes from './routes/stats.js';
import reportRoutes from './routes/reports.js';
import seoRoutes from './routes/seo.js';
import { UPLOAD_DIR, setUploadHeaders } from './lib/upload.js';
import { resolveCorsOrigin } from './lib/cors.js';

const app = express();

/* ══════════════════════════════════════════════════
   اعتماد به پراکسی — شرط درست کار کردن محدودیت نرخ.

   محدودیت نرخ روی req.ip کلید می‌خورد. اگر سرور پشت
   nginx یا کلادفلر باشد، req.ip آدرس خودِ پراکسی است،
   نه آدرس مشتری — یعنی همهٔ بازدیدکنندگان یک کلید
   مشترک می‌گیرند و بعد از ۵ ورود ناموفق، کل سایت برای
   همه قفل می‌شود.

   با این تنظیم، express آدرس واقعی را از X-Forwarded-For
   برمی‌دارد.

   ولی نمی‌شود همیشه روشنش گذاشت: جایی که پراکسی وجود
   ندارد، هر کلاینتی می‌تواند X-Forwarded-For جعلی بفرستد
   و با هر درخواست یک آدرس تازه بسازد — و محدودیت نرخ
   عملاً بی‌اثر شود. پس فقط در تولید، یا با پرچم صریح
   برای وقتی که واقعاً پراکسی جلوی سرور هست.
   ══════════════════════════════════════════════════ */
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1); // یک گام پراکسی جلوتر
}

/* ══════════════════════════════════════════════════
   فشرده‌سازی پاسخ‌ها (بخشی از مورد ۲۴).

   پاسخ‌های این API متن‌اند و متنِ فارسی در UTF-8 سه بایت
   برای هر حرف می‌گیرد، پس بزرگ‌ترند از آنچه به‌نظر
   می‌رسند: فهرست کالاها ۵۳ کیلوبایت و متن‌های سایت ۱۱.۵
   کیلوبایت خام بود — و همه‌شان بی‌فشرده روی سیم می‌رفتند.
   با gzip چیزی حدود یک‌پنجم می‌شوند.

   پیش از helmet و مسیرها می‌نشیند تا همهٔ پاسخ‌ها — از
   جمله خروجی‌های استریمیِ CSV و JSON گزارش‌ها — از آن رد
   شوند.

   دو رفتار پیش‌فرضِ خودِ کتابخانه عمداً دست‌نخورده مانده:
   پاسخ‌های کوچک‌تر از یک کیلوبایت فشرده نمی‌شوند (سودش
   از هزینهٔ پردازشش کمتر است)، و هر پاسخی که
   Cache-Control: no-transform داشته باشد کنار گذاشته
   می‌شود.
   ══════════════════════════════════════════════════ */
app.use(compression());

/* ══════════════════════════════════════════════════
   هدرهای امنیتی.

   ── این سیاست دیگر مالِ صفحه‌ها نیست ──
   تا پیش از مهاجرت به Next، همین سرور HTML فروشگاه را هم
   می‌داد، پس سیاستش باید هر چیزی را که یک صفحهٔ واقعی لازم
   دارد پوشش می‌داد: فونت از گوگل، استایل درون‌خطی برای
   نوار نمودارها، و مانند این‌ها.

   حالا این سرور فقط JSON و XML و تصویر آپلودی می‌دهد.
   سیاستِ صفحه‌ها به web/src/proxy.js منتقل شده و آنجا
   سخت‌گیرانه‌تر هم شده: nonce به‌جای 'unsafe-inline' برای
   اسکریپت، و font-src روی 'self' چون فونت‌ها با next/font
   روی همان دامنه میزبانی می‌شوند (مورد ۲۵).

   پس دو بندی که برای گوگل‌فونتس باز بود برداشته شد. آنچه
   مانده:

   • defaultSrc با 'self' — پایهٔ محافظه‌کارانه.
   • imgSrc با 'data:' — برای تصویرهای آپلودی که ممکن است
     در پاسخ‌های همین سرور دیده شوند.

   بقیهٔ بندها (script-src 'self'، object-src 'none'، …) از
   پیش‌فرض helmet می‌آیند و برای یک API دست‌نخورده درست‌اند.
   تصویرهای /uploads سیاست سخت‌گیرانهٔ خودشان را از
   lib/upload.js می‌گیرند.
   ══════════════════════════════════════════════════ */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:']
      }
    },
    /* HSTS فقط وقتی معنا دارد که سایت روی https باشد.
       در توسعه روی http://localhost خاموشش می‌کنیم تا
       مرورگر دامنهٔ localhost را برای پروژه‌های دیگر هم
       به https قفل نکند — دردسری که پاک کردنش سخت است. */
    strictTransportSecurity: process.env.NODE_ENV === 'production'
  })
);

/* CORS — قاعده‌اش در lib/cors.js توضیح داده شده.
   اینجا فقط خطا را به پیام خط فرمان تبدیل می‌کنیم. */
let corsOrigin;
try {
  corsOrigin = resolveCorsOrigin();
} catch {
  /* انگلیسی، چون خروجی خط فرمان است. */
  console.error('\nX  CLIENT_ORIGIN must be set in production.');
  console.error('   Without it every origin would be allowed.');
  console.error('   Example:  CLIENT_ORIGIN=https://daneh.coffee,https://www.daneh.coffee\n');
  process.exit(1);
}

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '1mb' }));

/* تصویرهای آپلودشده — هدرهای سخت‌گیرش در lib/upload.js
   توضیح داده شده: nosniff، CSP سندبَکس و دانلودِ اجباری
   برای پسوندهای سندی، تا هیچ فایل آپلودی نتواند در مبدأ
   فروشگاه اجرا شود. index خاموش است تا فهرست پوشه لو نرود. */
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    maxAge: '7d',
    index: false,
    dotfiles: 'ignore',
    setHeaders: setUploadHeaders
  })
);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/club', clubRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/reports', reportRoutes);

/* ══════════════════════════════════════════════════
   sitemap.xml و robots.txt — در ریشه، چون ربات‌ها فقط
   آنجا دنبالشان می‌گردند (مورد ۲۹).

   این دو تنها آدرس‌های غیر-API این سرورند. صفحه‌ها را
   Next می‌سازد و در تولید یک پراکسی جلوی هر دو می‌نشیند:
   /api و /uploads و همین دو مسیر به اینجا، بقیه به Next.
   ══════════════════════════════════════════════════ */
app.use(seoRoutes);

/* ══════════════════════════════════════════════════
   هر آدرس دیگری اشتباه است.

   ── چه چیزی اینجا بود و رفت (مورد ۲۶) ──
   تا پیش از مهاجرت به Next، همین سرور خروجی build ویت را
   هم سرو می‌کرد: یک express.static روی client/dist، یک
   بازگشتِ SPA که هر آدرس ناشناخته را به index.html
   می‌داد، و routes/itemPages.js که برای /coffee/:slug
   تگ‌های <head> همان کالا را داخل آن HTML تزریق می‌کرد.

   هیچ‌کدام دیگر لازم نیست. Next خودش صفحه را روی سرور
   می‌سازد، با <head> واقعی و بدنهٔ واقعی — که همان چیزی
   بود که آن تزریق سعی می‌کرد جبرانش کند.

   پس این سرور از این به بعد **فقط API** است، و پاسخِ
   آدرس ناشناخته JSON است نه HTML.
   ══════════════════════════════════════════════════ */
app.use((_req, res) => res.status(404).json({ error: 'این آدرس وجود ندارد' }));

/* ── تبدیل خطاها به پیام فارسی خوانا ── */
app.use((err, _req, res, _next) => {
  /* خطای اعتبارسنجی mongoose */
  if (err.name === 'ValidationError') {
    const first = Object.values(err.errors)[0];
    return res.status(400).json({ error: first?.message || 'اطلاعات وارد شده کامل نیست' });
  }

  /* شناسهٔ تکراری */
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    const label = { slug: 'شناسه', username: 'نام کاربری', code: 'شمارهٔ سفارش' }[field] || 'مقدار';
    return res.status(400).json({ error: `این ${label} قبلاً استفاده شده است` });
  }

  /* شناسهٔ نامعتبر در آدرس */
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'شناسهٔ درخواستی معتبر نیست' });
  }

  console.error(err);
  res.status(500).json({ error: 'خطای غیرمنتظره در سرور' });
});

const PORT = Number(process.env.PORT || 4000);

connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`OK Server ready at http://localhost:${PORT}`);
  });

  /* پیام روشن به‌جای انبوه خطای Node.
     انگلیسی، چون خروجی خط فرمان است. */
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\nX  Port ${PORT} is already in use.`);
      console.error('   Another copy of the server is still running.');
      console.error('   Close it, or change PORT in server/.env');
      console.error('\n   To find and stop it on Windows (PowerShell):');
      console.error(
        `     Get-NetTCPConnection -LocalPort ${PORT} -State Listen | Select-Object OwningProcess`
      );
      console.error('     Stop-Process -Id <number-from-above> -Force\n');
    } else {
      console.error('\nX  Server failed to start:', err.message, '\n');
    }
    process.exit(1);
  });
});
