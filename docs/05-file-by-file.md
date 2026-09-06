# ۵. تحلیل فایل‌به‌فایل

این فصل هر فایل مهم پروژه را جداگانه بررسی می‌کند: مسئولیتش چیست، چه
توابعی دارد، به چه چیزی وابسته است و چه کسی از آن استفاده می‌کند.

---

# بخش الف — سرور

## `server/src/index.js` — نقطهٔ ورود سرور

**مسئولیت:** ساخت اپلیکیشن Express، ثبت میان‌افزارها و روترها، سرو کردن
فایل‌های ساخته‌شدهٔ فرانت، و تبدیل خطاها به پیام فارسی.

**وابستگی‌ها:** `dotenv/config`، `express`، `cors`، `helmet`، `node:path`،
`node:url`، هفت روتر، `./db.js`، `./lib/upload.js`، `./lib/cors.js`.

**ترتیب میان‌افزارها** (که در Express حیاتی است):

```js
/* فقط در تولید یا با پرچم صریح — وگرنه X-Forwarded-For جعلی
   محدودیت نرخ را بی‌اثر می‌کند */
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

app.use(helmet({ contentSecurityPolicy: { directives: { ... } },
                 strictTransportSecurity: process.env.NODE_ENV === 'production' }));
app.use(cors({ origin: corsOrigin }));      // corsOrigin از lib/cors.js
app.use(express.json({ limit: '1mb' }));

app.use('/uploads', express.static(UPLOAD_DIR, {
  maxAge: '7d', index: false, dotfiles: 'ignore', setHeaders: setUploadHeaders
}));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/club', clubRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/reports', reportRoutes);
```

`helmet` **اول** می‌آید تا هدرهای امنیتی روی هر پاسخی بنشیند، حتی
پاسخ‌های خطا. جزئیات هر بند CSP در فصل ۳ (بخش ۳.۹) آمده است.

روی `/uploads` سه گزینه بیش از پیش‌فرض تنظیم شده: `index: false` تا
فهرست پوشه لو نرود، `dotfiles: 'ignore'` و `setHeaders` که هدرهای
سخت‌گیر `lib/upload.js` را می‌گذارد.

**خروج مرگبار وقتی CORS تنظیم نشده:**

```js
let corsOrigin;
try {
  corsOrigin = resolveCorsOrigin();
} catch {
  console.error('\nX  CLIENT_ORIGIN must be set in production.');
  console.error('   Without it every origin would be allowed.');
  console.error('   Example:  CLIENT_ORIGIN=https://daneh.coffee,https://www.daneh.coffee\n');
  process.exit(1);
}
```

خودِ تصمیم در `lib/cors.js` است و `throw` می‌کند؛ `index.js` فقط آن را
به پیام خط فرمان و `exit` تبدیل می‌کند. این تقسیم عمدی است — تابعی که
`process.exit` صدا بزند تست‌پذیر نیست.

**آنچه اینجا بود و رفت — بازگشتِ SPA.**

تا پیش از مهاجرت به Next (مورد ۲۶)، همین فایل خروجی build فرانت را هم
سرو می‌کرد: یک `express.static` روی `client/dist` و یک الگوی
negative-lookahead که هر آدرسی جز `/api` و `/uploads` را به
`index.html` می‌فرستاد تا `react-router` مسیریابی کند.

هر سه تکه حذف شدند — `express.static(CLIENT_DIST)`، بازگشتِ SPA، و
`routes/itemPages.js` که برای `/coffee/:slug` تگ‌های `<head>` را داخل
همان HTML تزریق می‌کرد. حالا صفحه‌ها را Next می‌سازد و این سرور **هیچ
HTML ای نمی‌دهد**. آخرین میان‌افزارش این است:

```js
app.use((_req, res) => res.status(404).json({ error: 'این آدرس وجود ندارد' }));
```

یعنی پاسخِ آدرس ناشناخته JSON است، نه صفحه — که برای یک API درست است.
تنها آدرس‌های غیر-API که مانده‌اند `sitemap.xml` و `robots.txt` اند، چون
ربات‌ها فقط در ریشه دنبالشان می‌گردند و ساختنشان به مونگو نیاز دارد.

**فشرده‌سازی (مورد ۲۴).** پیش از helmet و مسیرها می‌نشیند تا خروجی‌های
استریمی هم از آن رد شوند:

```js
app.use(compression());
```

فهرست کالاها با همین یک خط از ۵۳ کیلوبایت به ۱۱.۷ کیلوبایت می‌رسد؛ متنِ
فارسی در UTF-8 سه بایت برای هر حرف می‌گیرد و خوب فشرده می‌شود.

**راهنمای `EADDRINUSE`:** بخشی که کمتر در پروژه‌ها دیده می‌شود:

```js
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nX  Port ${PORT} is already in use.`);
    console.error('   Another copy of the server is still running.');
    console.error('   Close it, or change PORT in server/.env');
    console.error('\n   To find and stop it on Windows (PowerShell):');
    console.error(`     Get-NetTCPConnection -LocalPort ${PORT} -State Listen | Select-Object OwningProcess`);
    console.error('     Stop-Process -Id <number-from-above> -Force\n');
  }
  process.exit(1);
});
```

به‌جای stack trace بیست‌خطی Node، دقیقاً دستور رفع مشکل داده می‌شود.

---

## `server/src/db.js` — اتصال پایگاه داده

**توابع:** فقط `connectDB()`.

```js
mongoose.set('strictQuery', true);
await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
```

`strictQuery: true` یعنی فیلدهایی که در schema نیستند در فیلتر کوئری
نادیده گرفته می‌شوند (نه اینکه خطا بدهند) — رفتار امن‌تر در برابر
پارامترهای ناخواستهٔ کاربر.

`serverSelectionTimeoutMS: 8000` به‌جای ۳۰ ثانیهٔ پیش‌فرض، خطا را سریع‌تر
نشان می‌دهد.

اگر `MONGODB_URI` نباشد یا اتصال شکست بخورد، `process.exit(1)` می‌کند —
یعنی سرور بدون پایگاه داده بالا نمی‌آید.

---

## `server/src/middleware/auth.js` — نگهبان مسیرها

**توابع:**

| تابع | امضا | کار |
|---|---|---|
| `signToken` | `(admin) → String` | ساخت JWT با `{sub, v}` |
| `requireAdmin` | `(req, res, next)` | بررسی توکن و پر کردن `req.admin` |

```js
export async function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'برای این کار باید وارد شوید' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(payload.sub);

    if (!admin) return res.status(401).json({ error: 'حساب مدیر پیدا نشد' });
    if (admin.tokenVersion !== payload.v) {
      return res.status(401).json({ error: 'رمز عوض شده است، دوباره وارد شوید' });
    }

    req.admin = admin;
    next();
  } catch {
    return res.status(401).json({ error: 'نشست شما منقضی شده است، دوباره وارد شوید' });
  }
}
```

**سه لایهٔ بررسی:** وجود توکن → معتبر بودن امضا و انقضا → همخوانی
`tokenVersion`. سه پیام خطای متفاوت هم به کاربر کمک می‌کند بفهمد چه شده.

`catch` خالی هر خطای `jwt.verify` (امضای غلط، انقضا، فرمت خراب) را به
یک پیام واحد تبدیل می‌کند — تا جزئیات فنی به مهاجم اطلاعات ندهد.

---

## `server/src/middleware/rateLimit.js` — محدودیت نرخ

**صادرات:** `loginLimiter`، `orderLimiter`، `trackLimiter`.

هر سه از یک سازندهٔ مشترک می‌آیند تا رفتارشان یکی باشد:

```js
function make({ windowMs, limit, error }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',   // هدرهای RateLimit-*
    legacyHeaders: false,         // X-RateLimit-* قدیمی لازم نیست
    skip: isOff,
    message: { error }            // همان شکل { error } بقیهٔ مسیرها
  });
}
```

`message: { error }` عمدی است: رابط کاربری برای ۴۲۹ هیچ کد خاصی ندارد،
چون شکل پاسخ با بقیهٔ خطاها یکی است و همان یک خط `data?.error` کافی است.

**اعداد از محیط، با پیش‌فرض امن:**

```js
const num = (raw, fallback) => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
```

مقدار خالی، منفی یا بی‌معنی در `.env` به پیش‌فرض برمی‌گردد — نه به
`NaN` که عملاً محدودیت را باز می‌کرد.

| متغیر محیطی | پیش‌فرض |
|---|---|
| `RATE_LIMIT_LOGIN_WINDOW_MIN` / `RATE_LIMIT_LOGIN_MAX` | ۱۵ دقیقه / ۵ |
| `RATE_LIMIT_ORDER_WINDOW_MIN` / `RATE_LIMIT_ORDER_MAX` | ۶۰ دقیقه / ۵ |
| `RATE_LIMIT_TRACK_WINDOW_MIN` / `RATE_LIMIT_TRACK_MAX` | ۱۵ دقیقه / ۲۰ |

**خاموشی در تست:**

```js
const isOff = () =>
  process.env.NODE_ENV === 'test' || process.env.RATE_LIMIT_DISABLED === '1';
```

مجموعهٔ تست باید بتواند پشت‌سرهم ده‌ها بار همان مسیر را صدا بزند؛
`RATE_LIMIT_DISABLED` هم برای آزمایش دستی روی ماشین خودی است.
`tests/rate-limit.test.js` دقیقاً همین را می‌سنجد — که در محیط تست خیلی
بیشتر از سقف هم عبور می‌کند.

---

## `server/src/lib/cors.js` — تصمیم CORS

**صادرات:** `parseOrigins(raw)` و `resolveCorsOrigin(env)`.

سه خط منطق که یک فایل جدا گرفته‌اند، چون تنها جایی است که تصمیم می‌گیرد
«چه کسی حق دارد به API ما درخواست بزند»:

```js
export function resolveCorsOrigin(env = process.env) {
  const origins = parseOrigins(env.CLIENT_ORIGIN);
  if (!origins.length && env.NODE_ENV === 'production') {
    throw new Error('CLIENT_ORIGIN must be set in production');
  }
  return origins.length ? origins : true;
}
```

`env` پارامتر است، نه `process.env` مستقیم — همین یک تغییر کوچک اجازه
داده `tests/cors.test.js` هر چهار ترکیب (تولید/توسعه × تنظیم‌شده/نشده)
را بدون دست‌کاری محیط واقعی بسنجد.

`parseOrigins` با کاما می‌شکند، فاصله‌ها را می‌گیرد و خالی‌ها را حذف
می‌کند، پس `"https://a.com, , https://b.com"` دو مبدأ می‌دهد.

---

## `server/src/lib/stock.js` — رزرو اتمی موجودی

**صادرات:** `unitsFor`، `isTracked`، `reserveStock`، `releaseStock`.

**مسئله:** دو مشتری هم‌زمان آخرین ۵۰۰ گرم یرگاچف را سفارش می‌دهند. با
الگوی «اول بخوان، بعد بنویس» هر دو «۵۰۰ گرم موجود است» را می‌بینند و هر
دو سفارش ثبت می‌شود — یک کیلو فروخته‌ایم که نداریم.

**راه‌حل:** شرط و کاهش در یک عملیات، زیر یک قفل سند:

```js
const updated = await ItemModel.findOneAndUpdate(
  { slug: item.slug, stock: { $gte: need } },
  { $inc: { stock: -need } },
  { new: true, projection: { stock: 1 } }
);
```

دقیقاً یکی از آن دو مشتری برنده می‌شود و دیگری `null` می‌گیرد. هیچ
transaction ای هم لازم نیست — که روی مونگوی تک‌گرهی اصلاً در دسترس نیست.

**سه تصمیم ظریف:**

۱) **کالای نامحدود اصلاً لمس نمی‌شود.** `isTracked` اول بررسی می‌کند:

```js
export function isTracked(item) {
  return typeof item?.stock === 'number' && Number.isFinite(item.stock);
}
```

`$inc` روی `null` خطا می‌دهد و شرط `{ $gte: need }` هم با `null` جور
نمی‌شود؛ یعنی حتی اگر اشتباهاً صدا زده شود، نتیجه به‌جای خراب شدن
«ناموجود» می‌شود.

۲) **واحد از نوع کالا می‌آید.** `unitsFor` برای ابزار `qty` و برای وزنی
`grams` را برمی‌دارد و گِرد می‌کند؛ ورودی نامعتبر صفر می‌شود، نه `NaN`.

۳) **همه یا هیچ.** هر ردیف جدا رزرو می‌شود، پس ممکن است ردیف سوم شکست
بخورد بعد از آنکه دو ردیف اول کم شده‌اند:

```js
if (!updated) {
  await releaseStock(taken, ItemModel);          // هرچه برداشته‌ایم برمی‌گردد
  const fresh = await ItemModel.findOne({ slug: item.slug }, { stock: 1 }).lean();
  const left = typeof fresh?.stock === 'number' ? fresh.stock : 0;
  return { error: shortMessage(item, left), taken: [] };
}
```

موجودی برای پیام خطا **دوباره از پایگاه داده خوانده می‌شود**، چون عددی
که در حافظه داشتیم ممکن است مالِ چند لحظه پیش باشد.

پیام هم واحدش را از نوع کالا می‌گیرد: «فقط ۳۰۰ گرم مانده است» در برابر
«فقط ۲ عدد مانده است»، و اگر صفر باشد «فعلاً موجود نیست».

---

## `server/src/lib/track.js` — پیگیری سفارش

**صادرات:** `normalizePhone`، `normalizeCode`، `safeEqual`،
`publicOrderView`، `NOT_FOUND_MESSAGE`، `findOrderForTracking`.

مشتری حساب کاربری ندارد، پس تنها چیزی که مالکیتش را ثابت می‌کند جفتِ
«شمارهٔ سفارش + شمارهٔ موبایل» است: کد را فقط کسی دارد که رسید را دیده و
شماره را فقط کسی که خودش سفارش داده.

**سه قاعده‌ای که این فایل نگه می‌دارد:**

**۱) هیچ‌وقت لو نده که کدی وجود دارد یا نه.** کد درست با شمارهٔ غلط باید
**دقیقاً** همان پاسخ «کد اصلاً وجود ندارد» را بگیرد، وگرنه صفحهٔ پیگیری
به ابزار شمارش سفارش‌ها تبدیل می‌شود.

**۲) مقایسه در زمان ثابت** — وگرنه خودِ زمانِ پاسخ همان چیزی را لو
می‌دهد که در بند ۱ پنهانش کردیم:

```js
export function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a ?? ''), 'utf8').digest();
  const hb = crypto.createHash('sha256').update(String(b ?? ''), 'utf8').digest();
  return crypto.timingSafeEqual(ha, hb);
}
```

اول هش، بعد مقایسه — چون `timingSafeEqual` طول‌های نابرابر را قبول
نمی‌کند و خودِ پرتاب خطا یک نشتِ زمانی است. خروجی sha256 همیشه ۳۲ بایت
است، پس مقایسه همیشه یک شکل دارد.

و در `findOrderForTracking`، حتی وقتی سفارشی پیدا نشده هم یک مقایسه
انجام می‌شود:

```js
const stored = normalizePhone(doc?.customer?.phone);
const matches = safeEqual(stored || ' no-order', wantedPhone);
if (!doc || !matches) return { status: 404, error: NOT_FOUND_MESSAGE };
```

**۳) فقط فیلدهایی که مشتری لازم دارد.** `publicOrderView` یک whitelist
صریح می‌سازد، نه یک `delete` روی سند:

```js
return {
  code, status, createdAt,
  customer: { name: order.customer?.name || '' },
  lines: (order.lines || []).map((l) => ({ kind, name, grams, qty,
    unitPrice, lineTotal, grindLabel, mix })),
  totals: { base, discount, discountLabel, shipping, total }
};
```

عمداً بیرون مانده‌اند: `_id` و `__v` و `updatedAt` (داخلی)، و **نشانی و
شمارهٔ تماس و یادداشت مشتری**. دیدنِ وضعیت و فهرست کالاها به نشانی نیازی
ندارد، و اگر روزی کسی جفت کد و شماره را حدس زد نباید نشانی خانهٔ کسی را
هم برداشته باشد. مزیت whitelist این است که هر فیلد داخلی‌ای که فردا به
مدل اضافه شود، **به‌طور پیش‌فرض بیرون می‌ماند** — و `track.test.js`
دقیقاً همین را می‌سنجد.

**نرمال‌سازی ورودی.** مشتری با کیبورد فارسی تایپ می‌کند و شکل‌های
مختلف باید یکی شمرده شوند:

```js
normalizePhone('۰۹۱۲ ۱۲۳-۴۵۶۷')  // '09121234567'
normalizePhone('+989121234567')   // '09121234567'
normalizeCode('a1b23456')         // 'A1B2-3456'
```

`normalizePhone` قرینهٔ `toLatinDigits` در کلاینت است و
`0098…`/`98…`/`9…` را همه به `09…` می‌رساند. `normalizeCode` خط تیره را
خودش می‌گذارد، چون شکل تولیدی همیشه چهار نویسه + چهار رقم است.

ورودی ناقص (کد یا شمارهٔ خالی) `400` می‌گیرد با پیام راهنما — نه `404`،
چون اینجا چیزی برای پنهان کردن نیست.

---

## `server/src/lib/upload.js` — آپلود تصویر

**صادرات:** `UPLOAD_DIR`، `ALLOWED`، `upload` (نمونهٔ multer)، و
`setUploadHeaders`.

```js
export const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
```

پوشه در زمان import ساخته می‌شود (`recursive: true` یعنی اگر بود خطا
نده).

**فهرست سفید — و غیبتِ عمدی SVG:**

```js
export const ALLOWED = {
  'image/jpeg': '.jpg',
  'image/png':  '.png',
  'image/webp': '.webp',
  'image/gif':  '.gif',
  'image/avif': '.avif'
};
```

SVG یک سند XML است، نه تصویر خام: می‌تواند `<script>` داشته باشد. و چون
از `/uploads` روی همان دامنهٔ سایت سرو می‌شود، آن اسکریپت در مبدأ خودِ
فروشگاه اجرا می‌شد — یعنی به توکن مدیر در `localStorage` هم دسترسی
داشت.

تصویرهای برداریِ خودِ سایت (`public/img`) از این راه نمی‌آیند و
دست‌نخورده‌اند؛ این فهرست فقط دربارهٔ چیزی است که مدیر از پنل آپلود
می‌کند.

پیام رد کردن هم عمداً اسم SVG را نمی‌آورد، فقط می‌گوید چه چیزی *مجاز*
است: «فقط تصویر JPG، PNG، WebP، AVIF یا GIF قابل آپلود است».

**نام تصادفی و سقف حجم:**

```js
const ext = ALLOWED[file.mimetype] || path.extname(file.originalname).toLowerCase() || '.bin';
cb(null, crypto.randomBytes(12).toString('hex') + ext);
// limits: { fileSize: 4 * 1024 * 1024 }
```

پسوند از **mimetype** ساخته می‌شود نه از نام فرستاده‌شده، و نام اصلی
(که ممکن است فارسی یا تکراری باشد) اصلاً استفاده نمی‌شود.

**لایهٔ دوم — هدرهای پوشه.** بستن فهرست مجاز فقط جلوی آپلودِ **تازه** را
می‌گیرد؛ هرچه پیش از این آپلود شده هنوز روی دیسک است و سرو می‌شود:

```js
export function setUploadHeaders(res, filePath) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');

  if (DOCUMENT_LIKE.has(path.extname(String(filePath || '')).toLowerCase())) {
    res.setHeader('Content-Disposition', 'attachment');
  }
}
```

| هدر | چه دری را می‌بندد |
|---|---|
| `nosniff` | مرورگر حق ندارد نوع فایل را از محتوایش حدس بزند؛ PNG با محتوای HTML همان PNG می‌ماند |
| `default-src 'none'; sandbox` | سند حق هیچ درخواستی ندارد و در مبدأ یکتا و بدون اسکریپت می‌نشیند — SVG قدیمیِ آلوده هم دیگر به مبدأ فروشگاه دسترسی ندارد |
| `Cross-Origin-Resource-Policy` | سایت دیگری نمی‌تواند این فایل‌ها را به منابع خودش وصل کند |
| `Content-Disposition: attachment` | باز کردن مستقیم `/uploads/x.svg` به‌جای رندر، دانلود می‌شود |

`DOCUMENT_LIKE` شامل `.svg .svgz .xml .html .htm .xhtml` است. مهم است که
`Content-Disposition` روی `<img src>` اثری **ندارد**، پس تصویرهای عادی
کارت‌ها سالم می‌مانند — و `upload.test.js` همین را جداگانه می‌سنجد.

---

## `server/src/models/*.js`

جزئیات کامل در فصل ۴. خلاصهٔ نقش هر کدام:

| فایل | صادرات | نکتهٔ کلیدی |
|---|---|---|
| `Item.js` | `Item` | قلاب `pre('validate')` با هفت گروه قاعده |
| `Order.js` | `Order` | سه سطح زیرسند، تولید `code` |
| `Admin.js` | `Admin` | `setPassword`/`checkPassword`، `select:false` |
| `ClubMember.js` | `ClubMember` | `phone` کلید یکتا |
| `Content.js` | `Content`, `loadContent` | `Mixed` + `minimize:false` |

---

## `server/src/routes/auth.js` — احراز هویت

**سه مسیر:**

`POST /login` — نکتهٔ امنیتی اصلی‌اش پیام یکسان است:

```js
const admin = await Admin.findOne({ username }).select('+passwordHash');

/* پیام یکسان برای نام کاربری اشتباه و رمز اشتباه،
   تا نشود فهمید کدام نام کاربری وجود دارد. */
const ok = admin && (await admin.checkPassword(password));
if (!ok) return res.status(401).json({ error: 'نام کاربری یا رمز عبور درست نیست' });
```

اگر پیام‌ها فرق می‌کردند («کاربر یافت نشد» در برابر «رمز غلط»)، مهاجم
می‌توانست فهرست نام‌های کاربری معتبر را کشف کند (user enumeration).

`GET /me` — فقط `requireAdmin` و برگرداندن نام کاربری. کلاینت با این
مسیر در بارگذاری اول اعتبار توکن ذخیره‌شده را می‌سنجد.

`POST /change-password` — پنج بررسی به ترتیب:

```js
if (!(await admin.checkPassword(current)))  → 'رمز فعلی درست نیست'
if (next_.length < 6)                       → 'رمز جدید دست‌کم ۶ نویسه باشد'
if (next_ !== confirm)                      → 'رمز جدید و تکرارش یکی نیستند'
if (next_ === current)                      → 'رمز جدید با رمز فعلی فرقی ندارد'
if (newUsername && taken)                   → 'این نام کاربری قبلاً گرفته شده است'
```

سپس:

```js
await admin.setPassword(next_);
admin.tokenVersion += 1;   // توکن‌های قدیمی باطل می‌شوند
await admin.save();

res.json({ ok: true, token: signToken(admin), admin: {...},
           message: 'رمز عبور با موفقیت عوض شد' });
```

بلافاصله توکن تازه برگردانده می‌شود تا خودِ مدیر از پنل بیرون نیفتد.
کامنت: «توکن تازه برمی‌گردانیم تا کاربر از پنل بیرون نیفتد.»

---

## `server/src/routes/items.js` — مدیریت کالا

**توابع کمکی:**

`pickBody(body)` — whitelist و نرمال‌سازی. مهم‌ترین محافظ در برابر
**mass assignment**:

```js
const WRITABLE = ['kind','slug','name','origin','spec','group','meter','price','stock',
  'notes','pairs','tag','shape','mat','tone','zoom','image','rank','active',
  'story','taste','recommend','tastes',
  'isBlend','house','customizable','components','pool','surcharge',
  'featured','pinnedTop','excludeTop'];

function pickBody(body) {
  const out = {};
  for (const key of WRITABLE) {
    if (body[key] === undefined) continue;
    out[key] = body[key];
  }
  ...
}
```

هر فیلدی که در `WRITABLE` نباشد — از جمله `_id`، `createdAt`،
`grindable`، `weighed` — بی‌صدا حذف می‌شود.

**`stock` نرمال‌سازی خودش را دارد،** چون سه حالت متفاوت دارد و «خالی» با
«صفر» یکی نیست:

```js
/* موجودی جدا از بقیهٔ عددهاست، چون «خالی» معنای خودش
   را دارد: نامحدود (null)، نه صفر. اگر با NUMBERS
   حساب می‌شد، رشتهٔ خالی دست‌نخورده می‌ماند و مونگو
   موقع cast خطا می‌داد. */
if (out.stock !== undefined) {
  const raw = out.stock === null ? '' : String(out.stock).trim();
  const n = raw === '' ? NaN : Number(raw);
  out.stock = Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
}
```

فیلد خالی در فرم یعنی `null` یعنی **نامحدود**؛ صفر یعنی **تمام شد**. اگر
این دو یکی می‌شدند، پاک کردن عدد از فرم به‌جای «نامحدود» می‌شد «ناموجود».

سپس سه نرمال‌سازی نوع:

```js
/* فهرست‌ها ممکن است به‌صورت رشتهٔ خط‌به‌خط بیایند */
for (const key of LISTS) {
  if (typeof out[key] === 'string') {
    out[key] = out[key].split('\n').map((s) => s.trim()).filter(Boolean);
  }
  if (Array.isArray(out[key])) {
    out[key] = out[key].map((s) => String(s).trim()).filter(Boolean);
  }
}

for (const key of NUMBERS) if (out[key] !== undefined && out[key] !== '') out[key] = Number(out[key]);
for (const key of BOOLEANS) if (out[key] !== undefined) out[key] = out[key] === true || out[key] === 'true';
```

پذیرش `'true'` رشته‌ای در کنار `true` بولی، برای سازگاری با فرم‌های
HTML است.

`checkBlend(data, selfSlug)` — سه بررسی یکپارچگی که در فصل ۴ آمد.

`removeImageFile(imagePath)` — پاک‌سازی فایل یتیم:

```js
function removeImageFile(imagePath) {
  if (!imagePath || !imagePath.startsWith('/uploads/')) return;
  const file = path.join(UPLOAD_DIR, path.basename(imagePath));
  fs.promises.unlink(file).catch(() => {});   // نبودن فایل مشکلی نیست
}
```

دو محافظ امنیتی: شرط `startsWith('/uploads/')` و `path.basename()` که
هر `../` را حذف می‌کند. `.catch(() => {})` هم یعنی اگر فایل نبود، برنامه
نمی‌شکند.

**هفت مسیر:**

| مسیر | نکته |
|---|---|
| `GET /` | `{active: true}` + `sort({rank:1, name:1})` + `lean({virtuals:true})` |
| `GET /admin/all` | بدون فیلتر `active`، با جست‌وجوی regex روی پنج فیلد |
| `GET /admin/:id` | یک کالا برای فرم |
| `POST /` | `pickBody` → `checkBlend` → `Item.create` → ۲۰۱ |
| `PUT /:id` | `findById` → `checkBlend` → پاک کردن عکس قدیمی → `Object.assign` → `save()` |
| `PATCH /:id/active` | `item.active = !item.active` |
| `DELETE /:id` | `findByIdAndDelete` + `removeImageFile` |
| `POST /upload` | multer با مدیریت خطای دستی |

مسیر آپلود شکل خاصی دارد چون خطاهای multer باید به فارسی تبدیل شوند:

```js
router.post('/upload', requireAdmin, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'فایلی انتخاب نشده است' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});
```

به‌جای اینکه `upload.single('image')` به‌عنوان میان‌افزار زنجیره شود،
دستی صدا زده می‌شود تا callback خطا در اختیار باشد.

---

## `server/src/routes/orders.js` — ثبت و مدیریت سفارش

**مهم‌ترین فایل امنیتی پروژه.** تحلیل کامل در فصل ۶ و ۷.

**تابع کمکی `grindMap()`:**

```js
async function grindMap() {
  const doc = await Content.findOne({ key: 'grinds' }).lean();
  const options = Array.isArray(doc?.data?.options) && doc.data.options.length
    ? doc.data.options
    : DEFAULT_GRINDS;
  return new Map(options.map((o) => [o.value, o.label]));
}
```

گزینه‌های آسیاب از پایگاه داده خوانده می‌شوند (چون مدیر می‌تواند
عوضشان کند) با fallback به `DEFAULT_GRINDS`.

**ثابت:** `const MIN_GRAMS = { coffee: 100, powder: 50 };`

**شش مسیر:** `POST /` (عمومی)، `GET /track` (عمومی)، `GET /` (فهرست +
شمارش)، `GET /:id`، `PATCH /:id/status`، `DELETE /:id`.

**ترتیب `/track` قبل از `/:id` اجباری است.** Express اولین مسیرِ
جوردرآمده را برمی‌دارد و `/:id` همه‌چیز را می‌گیرد؛ اگر جابه‌جا شوند،
`/track` پشت `requireAdmin` گیر می‌کند و مشتری هرگز به آن نمی‌رسد. کامنت
بالای مسیر همین را می‌گوید.

خودِ مسیر پیگیری تقریباً خالی است، چون منطقش در `lib/track.js` نشسته تا
بدون مونگو تست شود:

```js
router.get('/track', trackLimiter, async (req, res, next) => {
  try {
    const result = await findOrderForTracking(
      { code: req.query.code, phone: req.query.phone }, Order
    );
    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result.order);
  } catch (err) { next(err); }
});
```

**رزرو موجودی، درست پیش از ثبت:**

```js
/* آخرین کاری است که پیش از ثبت انجام می‌شود: تا اینجا
   هر خطای اعتبارسنجی بدون لمس انبار برگشته است، پس
   چیزی برای پس دادن نمی‌ماند. */
const { error: stockError, taken } = await reserveStock(lines, Item);
if (stockError) return res.status(409).json({ error: stockError });

let order;
try {
  order = await Order.create({ ... });
} catch (err) {
  await releaseStock(taken, Item);   // انبار نباید بی‌دلیل کم بماند
  throw err;
}
```

جای این چند خط در تابع مهم است: **بعد از** همهٔ اعتبارسنجی‌ها و
**قبل از** `Order.create`. هر خطای زودتر (وزن نامعتبر، دانهٔ ناشناخته،
مجموع درصدهای غلط) پیش از لمس انبار برمی‌گردد، پس نیازی به پس دادن ندارد.

مسیر فهرست، شمارش هر وضعیت را هم می‌دهد تا پنل بتواند عدد کنار هر
دکمهٔ فیلتر را نشان دهد:

```js
const counts = await Order.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
res.json({ orders, counts: Object.fromEntries(counts.map((c) => [c._id, c.n])) });
```

---

## `server/src/routes/content.js` — متن‌های سایت

سه مسیر ساده. نکتهٔ اصلی، **whitelist خودکار کلیدها** است:

```js
const KEYS = Object.keys(DEFAULT_CONTENT);

if (!KEYS.includes(key)) return res.status(400).json({ error: 'این بخش محتوا وجود ندارد' });
```

و اعتبارسنجی حداقلی نوع:

```js
const data = req.body?.data;
if (data === undefined || data === null || typeof data !== 'object') {
  return res.status(400).json({ error: 'محتوای ارسالی درست نیست' });
}
```

ذخیره با `upsert` انجام می‌شود تا اگر بخش هنوز در پایگاه داده نبود،
ساخته شود:

```js
const doc = await Content.findOneAndUpdate(
  { key }, { key, data },
  { new: true, upsert: true, setDefaultsOnInsert: true }
);
```

> **هشدار**
> `typeof data !== 'object'` تنها بررسی است. یعنی اگر مدیر
> `{reasons: "not an array"}` بفرستد، ذخیره می‌شود و بعداً
> `WhyUsSection` با `Array.isArray(c.reasons)` آن را رد می‌کند و بخش
> اصلاً رندر نمی‌شود. رفتار امن است اما بازخوردی به مدیر نمی‌دهد.

---

## `server/src/routes/club.js` — باشگاه مشتریان

**تابع `toLatin`:**

```js
const toLatin = (s) =>
  String(s ?? '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[\s-]/g, '');
```

سه تبدیل: رقم فارسی (U+06F0–U+06F9) → لاتین، رقم عربی (U+0660–U+0669) →
لاتین، و حذف فاصله و خط تیره. پس `۰۹۱۲ ۱۲۳-۴۵۶۷` به `09121234567`
تبدیل می‌شود.

توجه کنید که رقم فارسی و عربی **دو بلوک یونیکد جدا** هستند. کاربر ایرانی
معمولاً رقم فارسی می‌زند اما بعضی کیبوردها رقم عربی می‌دهند؛ هر دو
پوشش داده شده‌اند.

**`GET /export.csv`:**

```js
const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const rows = [
  ['نام', 'موبایل', 'ایمیل', 'سلیقه', 'تاریخ عضویت'].map(esc).join(','),
  ...members.map((m) => [m.name, m.phone, m.email, m.taste,
                         new Date(m.createdAt).toISOString()].map(esc).join(','))
].join('\r\n');

res.setHeader('Content-Type', 'text/csv; charset=utf-8');
res.setHeader('Content-Disposition', 'attachment; filename="club-members.csv"');
/* BOM تا اکسل فارسی را درست باز کند */
res.send('﻿' + rows);
```

سه جزئیات مهم:
- `""` برای escape کردن نقل‌قول داخل مقدار (استاندارد RFC 4180).
- `\r\n` به‌عنوان جداکنندهٔ خط (اکسل ویندوز).
- **BOM** (`﻿`) در ابتدا — بدون آن، اکسل فایل UTF-8 را با کدپیج
  محلی می‌خواند و فارسی به‌هم می‌ریزد.

---

## `server/src/routes/stats.js` — ویترین

`GET /top-sellers` — تحلیل کامل الگوریتم در فصل ۷.

`GET /featured` — ساده:

```js
const items = await Item.find({ active: true, featured: true })
  .sort({ rank: 1, name: 1 }).limit(limit).lean({ virtuals: true });
```

هر دو مسیر `Math.min(Number(req.query.limit) || 8, 24)` دارند تا کاربر
نتواند با `?limit=100000` سرور را خسته کند.

---

## `server/src/routes/reports.js` — گزارش و پشتیبان

**بزرگ‌ترین روتر پروژه (۳۸۵ خط).**

**ثابت‌ها:**

```js
const DEFAULT_COUNT = { day: 30, week: 12, month: 12, year: 6 };
const MAX_COUNT     = { day: 366, week: 260, month: 120, year: 40 };
```

**`buildFilter(query)`** — فیلتر مشترک بین چهار مسیر:

```js
function buildFilter(query) {
  const filter = {};

  const from = parseDate(query.from);
  const to   = parseDate(query.to);
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to)   filter.createdAt.$lt  = to;
  }

  if (query.status && query.status !== 'all') {
    if (!STATUSES.includes(query.status)) {
      const err = new Error('وضعیت نامعتبر است'); err.status = 400; throw err;
    }
    filter.status = query.status;
  }

  const q = String(query.q || '').trim();
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ code: rx }, { 'customer.name': rx },
                  { 'customer.phone': rx }, { 'lines.name': rx }];
  }

  return filter;
}
```

توجه کنید که بازه `$gte` تا `$lt` است (نه `$lte`) — یعنی **بستهٔ چپ،
بازِ راست**. این با `bucket.end` که دقیقاً `start` بازهٔ بعدی است جور
درمی‌آید و از شمارش دوباره جلوگیری می‌کند.

جست‌وجو حتی داخل `lines.name` هم می‌گردد، پس می‌شود پرسید «کدام
سفارش‌ها یرگاچف داشتند؟»

**`csvCell(v)` — محافظ CSV injection:**

```js
/* اکسل هر سلولی را که با = + - @ شروع شود «فرمول» حساب
   می‌کند. نشانی و توضیحِ مشتری را خود مشتری نوشته، پس
   ابتدایش یک آپاستروف می‌گذاریم تا متن بماند. */
function csvCell(v) {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}
```

این یکی از معدود جاهایی است که پروژه به حملهٔ **Formula Injection** فکر
کرده. اگر مشتری در فیلد نشانی بنویسد `=cmd|'/c calc'!A1` و مدیر فایل را
در اکسل باز کند، بدون این محافظ دستور اجرا می‌شد.

**دو حالت خروجی CSV:**

| `mode` | یک ردیف به ازای | ستون‌ها |
|---|---|---|
| `orders` | هر سفارش | ۱۸ ستون شامل خلاصهٔ کالاها |
| `lines` | هر ردیف کالا | ۱۷ ستون شامل ترکیب میکس |

توابع کمکی `mixText(l)`، `linesSummary(o)`، `orderRow(o)`، `lineRows(o)`.

**استریم کردن:** هر دو خروجی با `cursor()` نوشته می‌شوند. برای JSON،
حتی ساختار خارجی هم دستی نوشته می‌شود:

```js
res.write('{\n');
res.write(`  "exportedAt": ${JSON.stringify(new Date().toISOString())},\n`);
res.write('  "orders": [\n');

const cursor = Order.find(filter).sort({ createdAt: 1 }).lean().cursor();
let n = 0;
for await (const o of cursor) {
  res.write((n ? ',\n' : '') + '    ' + JSON.stringify(o));
  n += 1;
}
res.write(`\n  ],\n  "count": ${n}\n}\n`);
res.end();
```

`(n ? ',\n' : '')` کاماهای بین عناصر آرایه را می‌گذارد بدون اینکه کامای
اضافه در انتها بیفتد.

**مدیریت خطا در حین استریم:**

```js
} catch (err) {
  if (res.headersSent) return res.destroy(err);
  ...
}
```

اگر هدرها رفته باشند دیگر نمی‌شود کد وضعیت عوض کرد؛ تنها کار درست، قطع
کردن اتصال است تا کلاینت بفهمد فایل ناقص است.

**نام فایل با پشتیبانی یونیکد:**

```js
res.setHeader('Content-Disposition',
  `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`);
```

شکل `filename*=UTF-8''...` طبق RFC 5987 برای نام‌های غیر-ASCII است و
مرورگرهای مدرن آن را ترجیح می‌دهند.

---

## `server/src/data/*`

| فایل | صادرات | نکته |
|---|---|---|
| `default-content.js` | `DEFAULT_CONTENT` | هفت کلید؛ `KEYS` روتر از اینجا مشتق می‌شود |
| `seed-items.js` | `SEED_ITEMS` | ۱۰۶ شیء JSON یک‌خطی |
| `seed-enrich.js` | `TASTE_TAGS`, `STORIES`, `BLENDS` | متن معرفی + ترکیب میکس |

`seed-items.js` عمداً یک‌خطی نوشته شده؛ کامنت بالایش می‌گوید:

> این فایل به‌صورت خودکار از نسخهٔ اولیهٔ سایت ساخته شده و فقط برای پر
> کردن اولیهٔ پایگاه داده است. بعد از seed، منبع حقیقت پایگاه داده و
> پنل مدیریت است، نه این فایل.

هر دو فایل seed در `.prettierignore` هستند: هر ردیف عمداً یک خط بلند است
تا کاتالوگ در یک نگاه خوانده شود، و شکستنشان خوانایی را کم می‌کند.

> **نکته**
> `taxonomy.js` قبلاً اینجا بود. حالا در `shared/taxonomy.js` است تا
> کلاینت هم بتواند همان کلیدها را import کند — بخش بعدی.

---

# بخش الف‌–۲ — بستهٔ مشترک

## `shared/package.json`

بستهٔ خصوصیِ `@ghahve/shared` با دقیقاً سه export و بدون هیچ وابستگی:

```json
{
  "name": "@ghahve/shared",
  "private": true,
  "type": "module",
  "exports": {
    "./pricing.js": "./pricing.js",
    "./taxonomy.js": "./taxonomy.js",
    "./seo.js": "./seo.js"
  }
}
```

`exports` صریح یعنی هیچ‌کس نمی‌تواند به فایل سومی از این بسته دست ببرد؛
هر چیزی که اضافه شود باید عمداً اینجا اعلام شود.

چون در `workspaces` ریشه ثبت شده، npm خودش در `node_modules` پیوندش
می‌کند و هر دو طرف با همان نام import می‌کنند — بدون مسیر نسبی، بدون
symlink دستی، بدون مرحلهٔ build.

## `shared/pricing.js` — تنها نسخهٔ محاسبهٔ قیمت

**صادرات:** `TIERS`، `SHIPPING`، `FREE_SHIPPING_FROM`، `priceFor`،
`blendPricePerKg`، `unitPriceFor`، `computeTotals`، `lineTotal`.

تحلیل کامل فرمول‌ها در فصل ۷. آنچه اینجا اهمیت دارد **جای فایل** است.
کامنت بالایش داستان را می‌گوید:

> تا پیش از این دو نسخهٔ یکسان از این فایل وجود داشت، یکی در client و
> یکی در server، که باید دستی همگام می‌ماندند. خطرش این بود که کسی
> پله‌های تخفیف را در یکی عوض کند و عددی که مشتری می‌بیند با عددی که ثبت
> می‌شود فرق کند — بی هیچ خطایی.

و بلافاصله یادآوری می‌کند که این جایگزین بازمحاسبهٔ سمت سرور **نیست**:

> سرور همچنان قیمت را از نو حساب می‌کند و به عددِ ارسالی از مرورگر
> اعتماد نمی‌کند. یکی بودنِ فرمول جای آن بازمحاسبه را نمی‌گیرد؛ فقط
> تضمین می‌کند نتیجه با چیزی که کاربر دیده یکی دربیاید.

جدول `TIERS` با `// prettier-ignore` علامت خورده و اعشارها کامل نوشته
شده‌اند (`0.10` نه `0.1`) تا ستون‌به‌ستون خوانده شود — این یک جدول است،
نه چند سطر کد.

## `shared/taxonomy.js` — تنها نسخهٔ کلیدهای مجاز

**صادرات:** `KINDS`, `GROUPS_BY_KIND`, `GEAR_SHAPES` (۳۶),
`GEAR_MATERIALS` (۱۱), `POWDER_SHAPES` (۱۴), `POWDER_TONES` (۱۶),
`IS_WEIGHED`, `DEFAULT_GRINDS` (۷), `TASTE_KEYS` (۸).

مدل `Item` با همین‌ها اعتبارسنجی می‌شود تا هیچ‌وقت کالایی ذخیره نشود که
طرح تصویرش وجود ندارد، و `web/src/lib/groups.js` برچسب فارسیِ هر کلید
را کنارش می‌گذارد.

تقسیم کار عمدی است: **کلید** اینجاست چون هر دو طرف باید یکی ببینندش؛
**برچسب فارسی** آنجاست چون فقط رابط کاربری به آن نیاز دارد و سرور کاری
با متن ندارد. `tests/taxonomy.test.js` می‌سنجد که جدول برچسب‌ها دقیقاً
همین کلیدها را پوشش بدهد — نه یکی کم، نه یکی زیاد.

## `shared/seo.js` — آدرس، متن صفحه و داده‌های ساختاریافته

سومین فایل این بسته و تازه‌ترینشان (موردهای ۲۷ تا ۲۹). چهار دسته چیز
دارد و همه‌شان دو مصرف‌کننده:

| دسته | صادرات | وب | سرور |
|---|---|---|---|
| آدرس کالا | `KIND_SEGMENT`, `SEGMENT_KIND`, `KIND_SEGMENTS`, `itemPath`, `itemUrl`, `absoluteUrl`, `normalizeBaseUrl` | مسیر صفحه‌ها و لینک کارت‌ها | لینک‌های `sitemap.xml` |
| متن صفحه | `SITE_NAME`, `SITE_LANG`, `SITE_DIR`, `SITE_LOCALE`, `HOME_TITLE`, `HOME_DESCRIPTION`, `itemTitle`, `itemDescription`, `itemImage`, `clamp` | `generateMetadata` هر صفحه | — |
| توصیف `<head>` | `itemHeadState`, `notFoundHeadState`, `headTags`, `identityOf` | ورودیِ `lib/metadata.js` | — |
| ماشین‌خوان | `productJsonLd`, `organizationJsonLd`, `jsonLdText`, `buildSitemap`, `buildRobots`, `itemSitemapEntries`, `escapeXml`, `lastmodOf` | JSON-LD صفحه‌ها | `routes/seo.js` |

**چرا اینجا و نه در `web`؟** چون دو مصرف‌کننده دارد و باید دقیقاً یک
آدرس بسازند. کامنت بالای فایل می‌گوید اگر دو نسخه می‌شد، «روزی که بخش
قهوه از `/coffee` به `/beans` می‌رفت، نقشهٔ سایت بی‌سروصدا به صفحه‌های
۴۰۴ اشاره می‌کرد».

**و چرا متن فارسی دارد، برخلاف قاعدهٔ ۶ پروژه؟** این تنها استثناست و
خودش مستند شده: عنوان و توضیحِ صفحهٔ کالا هم در متادیتای Next لازم است و
هم — تا وقتی نقشهٔ سایت را Express می‌سازد — در سرور. دو نسخه شدنشان یعنی
چیزی که در تلگرام دیده می‌شود با تبِ مرورگر فرق کند. مرز دقیق است:
**محتوای صفحه** اینجا، **برچسب رابط کاربری** در `groups.js`.

دو نکتهٔ ریز که ارزش دیدن دارند:

**واحد پول در JSON-LD.** قیمت‌های پایگاه داده به تومان‌اند، ولی
schema.org کد ISO 4217 می‌خواهد و کد رسمی ایران ریال است. پس:

```js
export const CURRENCY = 'IRR';
export const TOMAN_TO_RIAL = 10;
export const toRial = (toman) => Math.round(Number(toman) || 0) * TOMAN_TO_RIAL;
```

«IRT» کد استانداردی نیست و گوگل ردش می‌کند. و برای کالای وزنی یک
`UnitPriceSpecification` با `unitCode: 'KGM'` اضافه می‌شود، وگرنه گوگل
قیمتِ هر کیلو را قیمت یک بسته می‌فهمید.

**بی‌خطر کردن JSON پیش از رفتن داخل `<script>`:**

```js
export function jsonLdText(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
```

نام کالا را مدیر می‌نویسد. با این تبدیل، نامی مثل `</script><script>`
هیچ پارسر HTML ای را گول نمی‌زند، ولی `JSON.parse` همان مقدار را
می‌خواند. `U+2028` و `U+2029` هم بسته می‌شوند: در JSON مجازند ولی در
جاوااسکریپت پایان خط حساب می‌شوند.

نگهبان‌هایش: `tests/item-routes.test.js`، `tests/json-ld.test.js`،
`tests/sitemap.test.js` و `tests/next-metadata.test.js`.

---

# بخش ب — وب: زیرساخت

## `web/src/app/layout.jsx` — پوستهٔ همهٔ صفحه‌ها

جانشین `client/index.html` و `client/src/main.jsx`. چهار کار می‌کند:

```jsx
export default function RootLayout({ children, modal }) {
  return (
    <html lang={SITE_LANG} dir={SITE_DIR} className={`${vazirmatn.variable} ${lalezar.variable}`}>
      <body>
        {children}
        {modal}
        <Toast />
      </body>
    </html>
  );
}
```

**یک) زبان، جهت و فونت.** `lang` و `dir` از `shared/seo.js` می‌آیند، نه
ثابتِ نوشته‌شده. کلاس‌های فونت متغیرهای `--font-vazirmatn` و
`--font-lalezar` را روی `<html>` می‌گذارند و استایل‌نامه از همان‌ها
می‌خواند — چون `next/font` نام خانواده را خودش می‌سازد.

**دو) شکاف دوم صفحه.** `modal` یک **مسیر موازی** است (`app/@modal`). در
حال عادی خالی است؛ با کلیک روی کارتی از داخل سایت، مسیرِ رهگیری‌شده آن را
پر می‌کند و `children` — یعنی صفحهٔ زیر — دست‌نخورده می‌ماند. این جانشین
`state.backgroundLocation` در نسخهٔ react-router است.

**سه) یک توست، برای هر دو شکاف.** `<Toast />` **یک بار** و بالای هر دو
شکاف رندر می‌شود. جایش عمداً همین‌جاست: پیام‌ها از یک انبارهٔ ماژولی
می‌آیند نه از کانتکست، پس هم صفحه و هم مودالِ رهگیری‌شده می‌توانند پیام
بدهند و هر دو همان یک نوارِ پایین صفحه را روشن می‌کنند. تا پیش از این
چند خط داخل `HomeShell` بود، یعنی فقط صفحهٔ اصلی توست داشت و صفحهٔ کالا
و مودالش هر دو بی‌صدا بودند.

**چهار) پیش‌فرضِ `<head>`.** یک `metadata` صادر می‌کند که عنوان و توضیح و
Open Graph پیش‌فرض را می‌دهد. برخلاف `index.html` قدیم، این پیش‌فرض
واقعاً پیش‌فرض است: هر مسیری که `generateMetadata` خودش را داشته باشد
جایش را می‌گیرد و Next تضمین می‌کند تگ دوباره ساخته نشود. به همین دلیل
`client/src/lib/head.js` — با آن پشتهٔ سه‌حالته و صفت‌های `data-head-*` —
دیگر وجود ندارد.

و یک تصمیم که جایش همین‌جاست:

```js
export const dynamic = 'force-dynamic';
```

سیاست امنیتی صفحه‌ها با **nonce** کار می‌کند و nonce برای هر درخواست تازه
ساخته می‌شود؛ صفحه‌ای که موقع build ساخته شده باشد آن را ندارد و
اسکریپت‌هایش بسته می‌شوند. پس بین «کشِ ایستا» و «سیاست سخت‌گیرانه»، دومی
انتخاب شد. دلیل کامل داخل خودِ فایل نوشته شده.

> هر دو فایل CSS همین‌جا import می‌شوند. بازدیدکنندهٔ فروشگاه هنوز CSS پنل
> را هم می‌گیرد — همان ضعفِ کوچکِ قبلی، که با کد اسپلیت (مورد ۲۰) قابل
> رفع است.

---

## `web/src/app/` — جدول مسیرها به‌جای `App.jsx`

در نسخهٔ react-router یک فایل (`App.jsx`) همهٔ مسیرها را در یک `<Routes>`
فهرست می‌کرد. حالا **ساختار پوشه‌ها همان جدول است**:

| آدرس | پوشه |
|---|---|
| `/` | `app/page.jsx` |
| `/coffee/:slug` و همتاها | `app/coffee/[slug]/` (سه پوشه، یک پیاده‌سازی در `app/_item/`) |
| همان آدرس‌ها، به‌شکل مودال | `app/@modal/(.)coffee/[slug]/` |
| `/track` | `app/track/` |
| `/admin/login` | `app/admin/login/` |
| هشت صفحهٔ پنل | `app/admin/(panel)/*/` |
| آدرس ناشناخته | `app/not-found.jsx` → **۴۰۴** |

سه تفاوت که ارزش گفتن دارند:

**۱) Provider ها جای ثابتی ندارند.** پیش‌تر `AuthProvider` و
`ShopProvider` دور کل جدول مسیرها می‌پیچیدند. حالا هرکس آن‌جا که لازم است
گذاشته می‌شود: `ShopProvider` در `app/page.jsx` (با کالاهای خواندهٔ سرور)،
در صفحهٔ کالا (با فهرستِ کوچک‌تر)، و در پنل (با `loadOnMount`)؛
`AuthProvider` فقط در `app/admin/layout.jsx`. نتیجه‌اش این است که صفحهٔ
پیگیری سفارش هیچ‌کدام را حمل نمی‌کند.

**۲) آدرس ناشناخته دیگر بی‌صدا به خانه نمی‌رود.** سطر آخر جدول قبلی
`<Route path="*" element={<Navigate to="/" replace />} />` بود که پاسخ
**۲۰۰** می‌داد — از دید موتور جست‌وجو یعنی «این آدرس وجود دارد». حالا
۴۰۴ واقعی است.

**۳) `/track` هنوز تنها صفحهٔ عمومیِ دوم است** و همچنان بیرون از دروازهٔ
پنل می‌نشیند — همان تقسیمِ قبلی، این بار با پوشه.

---

## `web/next.config.mjs` — پراکسی، بستهٔ مشترک، و بهینه‌ساز تصویر

پنج بند، و هر پنج لازم:

```js
outputFileTracingRoot: path.join(__dirname, '..'),   // پروژه workspace است
transpilePackages: ['@ghahve/shared'],               // بستهٔ محلیِ ترنسپایل‌نشده
images: { /* AVIF/WebP · localPatterns · imageSizes · minimumCacheTTL */ }
async headers()  { /* دو هدر روی /_next/image */ }
async rewrites() { /* /api · /uploads · /sitemap.xml · /robots.txt → Express */ }
```

`rewrites` جانشین بند `server.proxy` در `vite.config.js` است و همان
نتیجه را می‌دهد: مرورگر همچنان آدرس نسبی می‌زند، پس `lib/api.js`
دست‌نخورده منتقل شد و مسئلهٔ CORS اصلاً پیش نمی‌آید.

`sitemap.xml` و `robots.txt` هم عمداً در همین فهرست‌اند — همان‌جا از
فهرست زندهٔ کالاها ساخته می‌شوند و دلیلی برای دو نسخه شدنشان نیست.

### بند `images` — نیمهٔ دوم مورد ۲۴

```js
images: {
  formats: ['image/avif', 'image/webp'],
  localPatterns: [{ pathname: '/uploads/**' }, { pathname: '/img/**' }],
  imageSizes: [32, 48, 64, 96, 128, 256, 384, 448],
  minimumCacheTTL: 604800
}
```

| بند | چرا این مقدار |
|---|---|
| `formats` | به ترتیب اولویت: مرورگری که AVIF بفهمد AVIF می‌گیرد، وگرنه WebP، وگرنه همان قالب اصلی |
| `localPatterns` | **قفلِ عمدی.** بدون آن هر مسیر محلی‌ای بهینه‌شدنی است و `/_next/image` عملاً یک واکشیِ عمومی می‌شود. این دو تنها جاهایی‌اند که تصویر واقعی از آن‌ها می‌آید |
| `imageSizes` | `448` به فهرست پیش‌فرض اضافه شده: کارت فهرست روی دسکتاپ ۳۸۵ و روی تبلت تا ۴۳۱ پیکسل عرض می‌گیرد، و با فهرست پیش‌فرض نزدیک‌ترین نسخهٔ بزرگ‌تر برای هر دو ۶۴۰ بود |
| `minimumCacheTTL` | هفت روز — هم‌تراز با `maxAge` پوشهٔ `uploads` در سرور. نام فایل آپلودی تصادفی است و هیچ‌وقت بازنویسی نمی‌شود، پس کش طولانی بی‌خطر است |

**مسیر داخلی، نه بیرونی.** بهینه‌ساز برای آدرس‌های محلی درخواست را از
**همین** مسیریاب Next رد می‌کند، یعنی از همان `rewrites` پایین‌تر. پس
`/uploads/x.jpg` به Express می‌رسد بدون اینکه آدرس داخلی Express به
مرورگر درز کند و بدون اینکه `remotePatterns` لازم شود.

**و آنچه عمداً دست نخورد:** `dangerouslyAllowSVG` خاموش ماند (مورد ۵:
SVG یک سند اجراشدنی است)، و `contentDispositionType` و
`contentSecurityPolicy` پیش‌فرضِ Next اند که همان سیاست `sandbox` پوشهٔ
`uploads` را می‌دهند. کدِ `lib/img.js` مطمئن می‌شود هیچ SVG ای اصلاً به
اینجا نرسد.

### بند `headers()` — دو محافظ که Next نمی‌گذارد

```js
async headers() {
  return [{
    source: '/_next/image',
    headers: [
      { key: 'x-content-type-options', value: 'nosniff' },
      { key: 'cross-origin-resource-policy', value: 'same-origin' },
      { key: 'x-frame-options', value: 'DENY' }
    ]
  }];
}
```

تصویرهای `/uploads` دو لایه محافظ داشتند (پای `setUploadHeaders` در
`server/src/lib/upload.js`). حالا مرورگر دیگر مستقیم آن آدرس را
نمی‌خواند و پاسخ را از `/_next/image` می‌گیرد — پس هدرهای Express روی
آن پاسخ **نیستند**.

خودِ Next دوتای مهم را می‌گذارد: همان
`script-src 'none'; frame-src 'none'; sandbox` و
`Content-Disposition: attachment`. سه‌تای بالا را نمی‌گذارد و اینجا
اضافه شده‌اند تا سیاستِ هر دو راه یکی بماند.

> **نکته**
> این کار از `proxy.js` برنمی‌آمد: آن میان‌افزار عمداً `_next/image` را
> رد می‌کند (مثل بقیهٔ دارایی‌های `_next`)، چون CSP با nonce مالِ
> **صفحه**‌هاست نه فایل‌های ایستا.

## `web/src/proxy.js` — سیاست امنیتی صفحه‌ها

نامش در Next ۱۶ `proxy` است؛ همان چیزی که پیش‌تر `middleware` بود. برای
**هر درخواست** یک nonce تازه می‌سازد و آن را هم روی درخواست می‌گذارد (تا
Next روی اسکریپت‌های خودش بنشاندش) و هم روی پاسخ:

```js
const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
requestHeaders.set('x-nonce', nonce);
response.headers.set('content-security-policy', policyFor(nonce));
```

**چرا اصلاً لازم شد؟** سیاست پیشین می‌گفت `script-src 'self'` و برای یک
باندل ویت کافی بود، چون هیچ اسکریپت درون‌خطی نداشت. Next اما دادهٔ رندر
سمت سرور را به شکل چند `<script>` درون‌خطی داخل صفحه می‌گذارد و همان
سیاست دقیقاً آن‌ها را می‌بست — یعنی صفحه رندر می‌شد ولی هیچ‌وقت زنده
نمی‌شد.

راه ساده `'unsafe-inline'` بود که عملاً کل ارزش سیاست را دور می‌ریخت.
به‌جایش nonce، به‌علاوهٔ `'strict-dynamic'` تا باندل‌هایی که خودشان
اسکریپت می‌سازند اعتبار را به ارث ببرند.

سه چیز عمداً باز مانده و هر سه کامنت دارند:

| بند | چرا باز است |
|---|---|
| `style-src 'unsafe-inline'` | صفتِ `style` با nonce کار نمی‌کند؛ نوار نمودار گزارش و متغیرهای CSS حالت تصویری میکس هر دو درون‌خطی‌اند |
| `img-src data:` | تصویر تولیدی SVG کارت‌ها و بافت نویز `style.css` |
| `'unsafe-eval'` و `ws:` | **فقط در توسعه** — بازآوری داغ Next بی این‌ها کار نمی‌کند |

و دو چیز نسبت به سیاست قدیمِ Express بسته‌تر شد: `font-src` دیگر
`fonts.gstatic.com` را ندارد و `style-src` دیگر `fonts.googleapis.com`
را — چون فونت‌ها با `next/font` روی همین دامنه‌اند (مورد ۲۵).

`matcher` مسیرهایی را که Express جواب می‌دهد یا فایل ایستا هستند کنار
می‌گذارد: نه nonce لازم دارند نه سیاست.

## `web/src/app/fonts.js` — فونت روی همین دامنه

`next/font/google` فایل فونت را **موقع build** می‌گیرد و کنار بقیهٔ
دارایی‌ها می‌گذارد؛ در زمان اجرا هیچ درخواستی به بیرون نمی‌رود. برای
مخاطب ایرانی این فقط یک بهینه‌سازی نیست: `fonts.googleapis.com` برای
بسیاری کند یا بسته است و صفحه تا تایم‌اوت شدنِ درخواست با فونت جایگزین
دیده می‌شد.

```js
export const vazirmatn = Vazirmatn({ subsets: ['arabic', 'latin'], variable: '--font-vazirmatn', display: 'swap' });
export const lalezar   = Lalezar({ subsets: ['arabic', 'latin'], weight: '400', variable: '--font-lalezar', display: 'swap' });
```

وزیرمتن روی گوگل‌فونتس فونت **متغیر** است، پس وزن جداگانه نمی‌گیرد —
همان یک فایل همهٔ وزن‌های ۳۰۰ تا ۹۰۰ را پوشش می‌دهد. لاله‌زار متغیر
نیست و وزنش اجباری است.

نام خانواده‌ای که Next می‌سازد هش‌دار است، پس هیچ‌جای استایل‌نامه
`'Vazirmatn'` نوشته نمی‌شود؛ همه‌چیز از راه متغیر می‌آید. جزئیاتش در
فصل ۸.

> **هشدار**
> `npm run build` به شبکه نیاز دارد، چون همان موقع فایل فونت‌ها گرفته
> می‌شود. در محیط بی‌اینترنت، build شکست می‌خورد — نه اجرا.

## `web/src/lib/data.js` — خواندن داده روی سرور

دو فایل شبکه داریم و این عمدی است: `api.js` برای مرورگر، `data.js` برای
سرور. **دو فایل، چون دو محیط — نه چون دو نسخه‌اند.**

```js
const API_URL = process.env.API_URL || 'http://localhost:4000';
const FETCH_OPTS = { cache: 'no-store' };

export const getItem  = cache(async (kind, slug) => { /* ۴۰۴ → null */ });
export const getItems = cache(async (kind = '') => { /* فهرست روشن‌ها */ });
export const getContent = cache(async () => { /* خطا → {} */ });
```

سه تصمیم:

**۱) آدرس مطلق.** `fetch` روی سرور «مبدأ صفحه» ندارد؛ `/api/items`
برایش معنایی ندارد. این فایل هیچ‌وقت در مرورگر اجرا نمی‌شود، پس نشتِ
آدرس داخلی هم ممکن نیست.

**۲) `cache` از ری‌اکت.** `generateMetadata` و خودِ صفحه هر دو همان کالا
را می‌خواهند؛ بی این، هر بازدید از صفحهٔ کالا دو درخواست به Express
می‌زد.

**۳) `no-store`.** داده‌ها زنده‌اند: مدیر هر لحظه ممکن است کالایی را
خاموش یا موجودی را کم کند. نسخهٔ کش‌شده یعنی فروختنِ چیزی که نداریم.

و یک تفاوت رفتاری که ارزش گفتن دارد: نبودِ **کالاها** خطا می‌دهد، نبودِ
**متن‌ها** نه. اگر Express خاموش باشد باید خطا بدهیم نه ۴۰۴ — «کالا پیدا
نشد» دربارهٔ کالایی که شاید هست، هم به کاربر دروغ می‌گوید و هم به موتور
جست‌وجو. ولی `getContent` در خطا `{}` می‌دهد: بخش‌های متنی رندر
نمی‌شوند و فروشگاه کار می‌کند — همان قاعدهٔ `api.content().catch(() => ({}))`
که در نسخهٔ ویت بود.

## `web/src/lib/metadata.js` — از توصیفِ `<head>` به شیء metadata

`toNextMetadata(state)` خروجی `itemHeadState` یا `notFoundHeadState` را
به شکلی که Next می‌فهمد ترجمه می‌کند. قراردادش صریح است: خروجی باید
**دقیقاً همان مقادیری** را داشته باشد که `headTags(state)` می‌ساخت —
و `tests/next-metadata.test.js` تگ‌به‌تگ همین را می‌سنجد.

پیش از مورد ۲۶، همان توصیف دو مصرف‌کننده داشت که باید مو به مو یکی
می‌ماندند: یکی در مرورگر که به عنصر DOM تبدیلش می‌کرد و یکی در سرور که
رشتهٔ HTML می‌ساخت. حالا یک رندرکنندهٔ بیشتر نیست: خودِ Next.

**و یک استثنا: `og:type`.**

```js
export const NEXT_OG_TYPES = new Set(['website', 'article', 'book', 'profile', /* music.* و video.* */]);

export const ogTypeFallback = (state = {}) =>
  state.ogType && !NEXT_OG_TYPES.has(state.ogType) ? state.ogType : '';
```

صفحهٔ کالا `og:type: product` می‌خواهد — همان چیزی که تلگرام و فیس‌بوک
برای کارت کالا می‌خوانند. Next فهرست بستهٔ خودش را دارد و برای هر چیز
دیگری موقع رندر **خطا می‌دهد**؛ یعنی کل `<head>` خالی می‌ماند، نه اینکه
فقط یک تگ بیفتد. اولین بار همین شد: صفحهٔ کالا بدنهٔ درست داشت و هیچ
عنوانی نداشت.

دو راه دیگر بررسی و رد شدند:

- `metadata.other` → تگ را با `name` می‌نویسد نه `property`، و خزندهٔ
  Open Graph سراغ `property` می‌رود. تگی که هست ولی خوانده نمی‌شود.
- عوض کردنش به `'website'` → کالا دیگر کالا نیست؛ عقب‌گرد واقعی.

پس همان یک تگ را خودِ صفحه رندر می‌کند و ری‌اکت ۱۹ به `<head>`
می‌بردش. اگر روزی Next فهرستش را باز کند، فقط همین مجموعه بزرگ می‌شود و
آن یک خط از صفحه برداشته می‌شود.

## `web/src/lib/site.js` — آدرس پایه و تصویر پیش‌نمایش

سه تابع کوچک روی متغیرهای محیطی: `siteBaseUrl`، `siteOgImage` و
`metadataBase`. نکتهٔ مهمشان این است که **روی سرور هم صدا زده می‌شوند**،
جایی که `window` وجود ندارد:

```js
export function siteBaseUrl(env = process.env) {
  const fromEnv = normalizeBaseUrl(env.NEXT_PUBLIC_SITE_URL);
  if (fromEnv) return fromEnv;
  return typeof window === 'undefined' ? '' : window.location.origin;
}
```

در نبودِ متغیر محیطی، به‌جای حدس زدن رشتهٔ خالی برمی‌گردد و Next مسیر
نسبی می‌سازد — «آدرس نسبی بهتر از آدرس غلط است». فقط `metadataBase`
استثناست: Next آنجا یک URL کامل می‌خواهد، وگرنه هشدار می‌دهد؛ پس در
توسعه `http://localhost:3000` گذاشته می‌شود.

## `web/src/lib/cartStorage.js` — سبد، بیرون از کامپوننت

`parseCart`، `loadCart(storage)`، `saveCart(storage, cart)` و
`browserStorage()`. تحلیل کاملش در ۴.۱۱ و ۷.۱۲ است؛ آنچه اینجا اهمیت
دارد این است که **حافظه پارامتر است**، نه `localStorage`ِ سراسری — همان
کاری که `reserveStock` در سرور با مدل مونگوس می‌کند. نتیجه‌اش این است
که `tests/cart-storage.test.js` بدون مرورگر و بدون ری‌اکت اجرا می‌شود.

## `web/src/lib/seo.js` — پلِ JSON-LD

آنچه در `shared/seo.js` تابع خالص است، اینجا با برچسب‌های فارسیِ
`groups.js` و آدرس پایهٔ `site.js` پر می‌شود: `productSchema(item)`،
`organizationSchema(content)`، `canonicalUrl(path)` و `asJsonLd(obj)`.

تقسیمش همان مرز همیشگی است: `shared` نمی‌داند برچسب فارسیِ دستهٔ کالا
چیست و نباید بداند؛ پس `category` و `brandName` و `soldOut` را از
اینجا پارامتر می‌گیرد.

## `web/src/lib/share.js` — نشانی، کپی، و اینکه کدام راه

**۱۴۸ خط، چهار تابع صادرشده و دو پیام.** همهٔ منطقِ دکمهٔ «برای دوستت
بفرست» اینجاست و هیچ‌کدامش در کامپوننت نیست — چون تابع خالص تست می‌شود و
کامپوننت نه.

**یک) نشانی از `canonical` می‌آید، نه از رشته‌بافیِ دستی:**

```js
export function itemShareUrl(item, env) {
  return itemHeadState(item, { baseUrl: siteBaseUrl(env) }).canonical;
}
```

این یک خط، همان قاعدهٔ ۴ پروژه است. لینکی که مشتری برای دوستش می‌فرستد
باید **دقیقاً** همان آدرسی باشد که در `canonical` و `og:url` صفحه نوشته
شده؛ وگرنه پیش‌نمایش تلگرام و واتساپ به یک آدرس نگاه می‌کند و لینک به
آدرسی دیگر می‌رود. اگر کسی روزی `'/coffee/' + item.slug` بنویسد، روزِ
عوض‌شدن مسیرها یا آدرس پایه لینک‌های فرستاده‌شده به ۴۰۴ می‌رسند و هیچ
چیزی خبردار نمی‌شود. `tests/share.test.js` صریحاً خروجی این تابع را با
`itemHeadState(...).canonical` و با `itemUrl(...)` — همان که
`sitemap.xml` می‌سازد — می‌سنجد.

**دو) ملاکِ دوراهی: نوعِ نشانگر، نه بودنِ `navigator.share`:**

```js
export function isTouchDevice(opts = {}) {
  const { nav = globalThis.navigator, win = globalThis } = opts;

  const mq = win?.matchMedia?.('(pointer: coarse)');
  if (typeof mq?.matches === 'boolean') return mq.matches;

  return Number(nav?.maxTouchPoints) > 0;
}
```

`(pointer: coarse)` یعنی **نشانگر اصلیِ** دستگاه انگشت است، نه ماوس.
لپ‌تاپ لمسی که ماوس هم دارد `fine` گزارش می‌دهد و درست هم همین است.
`maxTouchPoints` فقط تکیه‌گاه آخر است، برای مرورگرِ بی `matchMedia`؛
به‌تنهایی ملاک بدی است چون هر نمایشگر لمسیِ وصل به دسکتاپ آن را بالای
صفر می‌کند. چراییِ کاملِ این انتخاب در تصمیم ۲۸ فصل ۹ است.

**سه) کپی، با یک راه دوم:**

```js
export async function copyText(text, opts = {}) {
  const { nav = globalThis.navigator, doc = globalThis.document } = opts;

  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(text);
      return true;
    } catch {
      /* رد شدن اجازه یا زمینهٔ ناامن — راه دوم را امتحان کن */
    }
  }
  ...
}
```

`navigator.clipboard` فقط در «زمینهٔ امن» (https یا localhost) هست.
فروشگاهی که روی http ساده بالا آمده باشد اصلاً چنین چیزی ندارد، و آنجا
همان ترفند قدیمی — `textarea` موقت و `execCommand('copy')` — تنها راهی
است که کار می‌کند. منسوخ است، ولی جایگزینِ کارکننده‌ای ندارد و بی‌خطر
است: اگر هم نبود، فقط `false` برمی‌گرداند. `textarea` عمداً با
`opacity: 0` و بیرونِ قاب پنهان می‌شود و نه با `display: none` —
عنصری که رندر نشود انتخاب هم نمی‌شود.

**چهار) `shareItem` که چهار پایان دارد، نه دو تا:**

| `mode` | یعنی | چه چیزی به مشتری گفته می‌شود |
|---|---|---|
| `'shared'` | برگهٔ سیستم باز شد و کاربر فرستاد | هیچ — خودِ برگه بازخورد داده |
| `'canceled'` | کاربر برگه را بست | هیچ — نظرش عوض شده |
| `'copied'` | لینک در کلیپ‌بورد است | توست تأیید |
| `'failed'` | هیچ‌کدام نشد | توست راهنمایی |

جدا کردن `canceled` از `failed` ریز به‌نظر می‌رسد ولی نیست: بستنِ برگه
یک `AbortError` می‌دهد و اگر آن را شکست بحساب می‌آوردیم، هر بار که کسی
نظرش عوض می‌شد یک پیام خطا می‌گرفت.

```js
if (typeof nav?.share === 'function' && isTouchDevice({ nav, win })) {
  try {
    await nav.share({ title, url });
    return { mode: 'shared', url };
  } catch (err) {
    if (err?.name === 'AbortError') return { mode: 'canceled', url };
  }
}

return { mode: (await copyText(url, { nav, doc })) ? 'copied' : 'failed', url };
```

خطای **غیر از** `AbortError` عمداً از `try` بیرون می‌افتد و به همان مسیر
کپی می‌رسد — یعنی اگر `share` از کار افتاده باشد، دست مشتری خالی
نمی‌ماند.

**و پنج) همه‌چیز تزریق‌پذیر است.** `nav`، `doc`، `win` و `env` هر چهار
پارامترند و در عمل هیچ‌کس آن‌ها را نمی‌دهد. همان قاعدهٔ `reserveStock` در
سرور، این بار برای مرورگر: `tests/share.test.js` بدون jsdom اجرا می‌شود.

## `web/src/lib/toastStore.js` — پیام کوتاه، بیرون از هر کانتکست

**۸۰ خط.** یک انبارهٔ ماژولیِ ساده با سه تکه حالت و چهار تابع:

```js
export const TOAST_LIFETIME = 4500;

let message = '';
let timer = null;
const listeners = new Set();

export function toast(msg) {
  message = String(msg ?? '');
  clearTimeout(timer);
  timer = setTimeout(() => { message = ''; timer = null; emit(); }, TOAST_LIFETIME);
  emit();
}

export function subscribeToast(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getToast = () => message;
export const getServerToast = () => '';
```

**چرا از `ShopContext` بیرون آمد.** توست هیچ‌وقت واقعاً حالتِ فروشگاه
نبود؛ فقط آنجا زندگی می‌کرد چون اولین صداکننده‌اش سبد بود. مرزِ غلط، و
مودالِ کالا رویش گیر کرد: مودال در شکافِ `@modal` رندر می‌شود، یعنی
**بیرون** از `ShopProvider` صفحه. هر چیزی داخل مودال که بخواهد «شد»
بگوید، به چیزی نیاز دارد که به Provider وابسته نباشد. شرحِ کاملش در
تصمیم ۲۶ فصل ۹.

**سه ریزه‌کاری که هر کدام یک اشکالِ نادیدنی را می‌بندند:**

**۱) `clearTimeout` پیش از `setTimeout`.** بدون آن، پیام دومی که پشت
پیام اول بیاید شمارشِ اولی را به ارث می‌برد و زودتر از موعد می‌رود. یک
تست دقیقاً همین را می‌سنجد.

**۲) `getServerToast` که همیشه خالی است.** متغیرهای این ماژول روی سرور
بین درخواست‌ها مشترک‌اند. `toast()` فقط از دلِ رویدادهای مرورگر صدا زده
می‌شود پس در عمل پر نمی‌شوند، ولی snapshot جدا تضمین می‌کند که حتی در بدترین
حالت هم پیامِ یک بازدیدکننده داخل HTML بازدیدکنندهٔ بعدی ننشیند — و
`hydrate` هم شکایتی نداشته باشد.

**۳) عمرِ پیام ۴۵۰۰ میلی‌ثانیه است، و این عدد عوض شد.** ۲٬۶۰۰ بود، از
روزی که تنها پیام‌ها کوتاه بودند («به سبد اضافه شد»). بلندترین پیام حالا
پیامِ هم‌رسانی است — «لینک این کالا کپی شد — حالا می‌توانید بفرستیدش»،
نزدیک به پنجاه نویسه. و آن ۲.۶ ثانیه همه‌اش خواندنی نبود: ۰.۳ ثانیهٔ
اولش محوِ ورود است (`transition: opacity 0.3s` روی `.toast` در
`style.css`)، پس عملاً ۲.۳ ثانیه می‌ماند برای جمله‌ای که چشمِ فارسی‌خوان
دست‌کم سه ثانیه لازمش دارد.

> **نکته**
> عدد در همین ماژول است، نه در کامپوننت — چون هم `Toast.jsx` و هم
> `tests/toast-store.test.js` باید از یک جا بخوانندش. تست با
> `vi.useFakeTimers()` روی همین ثابت جلو می‌رود، پس عوض کردن عدد تست را
> نمی‌شکند.

## `web/src/lib/img.js` — کدام تصویر بهینه می‌شود

**۳۹ خط، دو تابع.** کوچک‌ترین فایل `lib/` و در عین حال نگهبانِ یک اشکالِ
پرهزینه: SVG ای که به بهینه‌ساز Next برسد قابِ خالی می‌دهد، نه عکسِ
بهینه‌نشده.

```js
const VECTOR = /\.svgz?(?:[?#]|$)/i;

export function isVector(src) {
  return VECTOR.test(String(src || ''));
}

export function isOptimizable(src) {
  const s = String(src || '');
  return s.startsWith('/') && !s.startsWith('//') && !isVector(s);
}
```

سه شرطِ `isOptimizable` هر کدام یک چیز را بیرون می‌گذارند:

| شرط | چه چیزی را رد می‌کند | چرا |
|---|---|---|
| `startsWith('/')` | آدرس مطلقِ بیرونی | بهینه‌ساز برای میزبانِ ثبت‌نشده در `remotePatterns` پاسخ ۴۰۰ می‌دهد |
| `!startsWith('//')` | آدرس بدون پروتکل (`//cdn…`) | همان مورد بالا، با ظاهرِ مسیر محلی |
| `!isVector(s)` | SVG و SVGZ | `dangerouslyAllowSVG` خاموش است (مورد ۵) |

الگوی `VECTOR` عمداً `[?#]` را هم می‌پذیرد: آدرس تصویر بخش «دربارهٔ ما»
را مدیر دستی می‌نویسد و ممکن است `?v=2` هم داشته باشد.

دو صداکننده دارد — `CardArt.jsx` و بخش «دربارهٔ ما» — و همین دلیلِ وجودش
است: قاعده یک‌جا باشد، نه دو تا.

## `web/src/lib/useStorefrontRefresh.js` — جانشین `reload()` در پنل

سه صفحهٔ پنل (کالاها، فرم کالا، محتوای سایت) بعد از هر تغییر باید
فروشگاه را تازه کنند. در نسخهٔ ویت این `useShop().reload()` بود، چون
`ShopContext` فهرست کالاها را یک بار می‌گرفت و در حافظه نگه می‌داشت.

در Next آن حافظه وجود ندارد — هر صفحهٔ فروشگاه در هر درخواست از نو ساخته
می‌شود — ولی یک کشِ دیگر هست: **کشِ مسیریابِ سمت مشتری**. اگر مدیر پیش از
رفتن به پنل صفحهٔ اصلی را دیده باشد، بازگشتش می‌تواند از همان نسخهٔ
کش‌شده بیاید.

```js
export function useStorefrontRefresh() {
  const router = useRouter();
  return useCallback(() => router.refresh(), [router]);
}
```

شکلِ صدا زدن در آن سه فایل دست‌نخورده ماند و فقط موتورش عوض شد — و پنل
به `ShopProvider` نیازی پیدا نکرد که فقط برای این کار باشد.

## `web/src/app/_item/` — یک پیاده‌سازی، سه پوشه

پوشه با `_` شروع می‌شود، پس Next آن را مسیر حساب نمی‌کند. پنج فایل:

| فایل | چیست |
|---|---|
| `itemRoute.jsx` | صفحهٔ کامل کالا + `itemMetadata(segment, props)` — **سروری** |
| `itemModalRoute.jsx` | نیمهٔ سروریِ مودال: فقط داده جمع می‌کند |
| `ItemModal.jsx` | نیمهٔ مشتری: `ItemDetail` + `router.back()` برای بستن |
| `ItemBuyCard.jsx` | ستون خرید — تنها تکهٔ مشتریِ صفحهٔ کالا |
| `ItemNotFound.jsx` | بدنه و `metadata` صفحهٔ ۴۰۴ کالا |

و هر پوشهٔ مسیر فقط چند خط است:

```jsx
// app/coffee/[slug]/page.jsx
const SEGMENT = 'coffee';
export const generateMetadata = (props) => itemMetadata(SEGMENT, props);
export default function Page(props) { return <ItemRoute segment={SEGMENT} {...props} />; }
```

در نسخهٔ ویت این سه مسیر با یک حلقه روی `KIND_SEGMENTS` ساخته می‌شدند،
پس نوعِ تازه در `taxonomy` خودبه‌خود مسیر هم می‌گرفت. App Router برای هر
مسیر یک پوشهٔ واقعی می‌خواهد و چنین حلقه‌ای ممکن نیست — آنچه از دست رفت
با `tests/next-routes.test.js` جبران شده: اگر segmentی پوشه نداشته باشد،
تست می‌شکند.

سه نکتهٔ دیگر در `itemRoute.jsx`:

**`ItemNotFound` `metadata` جدا دارد**، با اینکه صفحه خودش
`generateMetadata` دارد. دلیلش این است که وقتی `notFound()` صدا زده
می‌شود، Next نتیجهٔ `generateMetadata` همان مسیر را **دور می‌ریزد** و به
`metadata` لایهٔ بالاتر برمی‌گردد؛ بدون آن بلوک، صفحهٔ ۴۰۴ عنوان و
`og:image` صفحهٔ اصلی را می‌گرفت. `description` و `alternates` هم
صریحاً `null` اند، چون در Next کلیدی که ننویسی از والد به ارث می‌رسد و
«ننوشتن» با «نداشتن» یکی نیست.

**دانه‌های میکس فقط برای میکس‌ها خوانده می‌شوند.** کالای معمولی یک
درخواست می‌دهد و تمام؛ میکس یکی بیشتر، چون هم نام دانه‌ها در متن لازم
است و هم قیمتشان برای میانگین وزنی.

**فهرست عمداً ناقص است.** صفحه فقط خودِ کالا (و دانه‌هایش) را به
`ShopProvider` می‌دهد و `fullCatalogue={false}` می‌فرستد. دلیلش و
خطرش در ۷.۱۲ و ۹ (تصمیم ۲۵) آمده.

## `web/src/app/@modal/` — مودال پشت یک آدرس

سه پوشهٔ رهگیری‌شده (`(.)coffee/[slug]` و همتاها) و یک `default.jsx`.
مسیر موازیِ `@modal` در `app/layout.jsx` رندر می‌شود، کنار `children`.

کلیک از داخل سایت به این شکاف می‌رسد و صفحهٔ زیر سر جایش می‌ماند؛ بازدید
سرد یا رفرش به صفحهٔ کامل می‌رود. همان دو رفتاری که در نسخهٔ ویت با
`state.backgroundLocation` دستی ساخته می‌شد.

`default.jsx` که فقط `null` برمی‌گرداند، **لازم است**: بدون آن Next برای
بازدید سرد نمی‌داند شکاف را با چه چیزی پر کند و صفحه ۴۰۴ می‌شود.

و یک تصمیم که به سبد گره خورده: داده به مودال به‌شکل **نگاشت ساده**
می‌رسد (`beanNames`, `grindLabels`)، نه از کانتکست. چون این مودال در
شکافِ layout ریشه رندر می‌شود، یعنی **بیرون** از `ShopProvider`ی که
`app/page.jsx` می‌سازد. می‌شد یک Provider دوم اینجا هم گذاشت، ولی آن‌وقت
دو سبد جدا می‌داشتیم و افزودن از یکی روی دیگری اثر نمی‌کرد — دامی که
بعداً پیدا کردنش سخت است.

## `web/src/app/track/page.jsx` — و چرا `Suspense`

خودِ پیگیری نمی‌تواند سروری باشد: مشتری باید کد و موبایلش را بنویسد و آن
جفت هیچ‌وقت در آدرس نمی‌نشیند (و نباید بنشیند). پس فرم و نتیجه سمت مشتری
ماندند و آنچه سروری شد، تگ‌های `<head>` است — که برای `noindex` مهم
است: رباتی که جاوااسکریپت اجرا نمی‌کند هم آن را می‌بیند.

`Suspense` لازم است چون `Track` از `useSearchParams` استفاده می‌کند
(برای پیش‌پر کردن کد از لینکِ رسید) و Next می‌خواهد چنین تکه‌ای مرز
Suspense خودش را داشته باشد.

## `web/src/components/HomeShell.jsx` و `SiteHeader.jsx`

دو کامپوننتی که از تقسیم `pages/Home.jsx` قدیمی به‌وجود آمدند.

`HomeShell` بدنهٔ صفحهٔ اصلی است و `'use client'` دارد — نه از سلیقه،
بلکه چون فیلترهای دسته (`coffeeFilter` و همتاهایش) بالای چند بخش زندگی
می‌کنند: کارت‌های «روش دم‌آوری» و «راهنمای رست» هم عوضشان می‌کنند.

> این به معنای «سمت مشتری رندر شدن» **نیست**. کامپوننت مشتری هم روی سرور
> رندر می‌شود؛ متن همهٔ این بخش‌ها داخل خودِ HTML می‌آید. تفاوت فقط این
> است که جاوااسکریپتشان هم برای مرورگر فرستاده می‌شود — همان چیزی که در
> نسخهٔ ویت هم بود.

`SiteHeader` یک لایهٔ نازک است: `Header` یک تابع می‌خواهد
(`onOpenCart`) و **تابع از مرز سروری به مشتری رد نمی‌شود** — فقط دادهٔ
قابل‌سریال‌سازی رد می‌شود. پس صفحهٔ سروری نمی‌تواند خودش `Header` را با
کنترلِ سبد رندر کند. همین یک جا صاحب حالتِ سبد است، پس هر صفحه‌ای که هدر
دارد سبد هم دارد — صفحهٔ اصلی و صفحهٔ کالا رفتارشان یکی است.

## `web/src/components/ItemBody.jsx`

متنِ معرفی کالا: «این قهوه از کجا می‌آید»، «در فنجان چه می‌چشید»،
«پیشنهاد ما»، و برای میکس‌ها ترکیبش. یک کامپوننت **سروری** بدون هیچ
هوکی، که هم مودال از آن استفاده می‌کند و هم صفحهٔ کامل — پس آنچه گوگل
می‌خواند و آنچه بازدیدکننده می‌بیند یکی است. `headingLevel` پارامتر
دارد چون در صفحهٔ کامل زیر `<h1>` می‌نشیند و در مودال نه.

---

## `web/src/context/ShopContext.jsx` — قلب فروشگاه

بزرگ‌ترین مخزن منطق سمت کلاینت، و **تنها جایی که سبد عوض می‌شود**.

### شکل ردیف از `lib/cartLine.js` می‌آید

`mixSignature` و `lineKey` قبلاً همین‌جا تعریف می‌شدند؛ حالا از
`cartLine.js` می‌آیند و فقط دوباره صادر می‌شوند تا مصرف‌کننده‌های قدیمی
نشکنند:

```js
import { mixSignature, lineKey, buildLine } from '../lib/cartLine.js';
export { mixSignature, lineKey };
```

دلیل جابه‌جایی: میکس را حالا می‌شود از دو راه ساخت — اهرم‌های ساده و
حالت تصویری — و شکلِ ردیف باید جایی می‌بود که هر دو راه از آن رد شوند و
بشود بی‌مرورگر تستش کرد. `ShopContext` همچنان تنها جایی است که سبد را
عوض می‌کند؛ `cartLine.js` فقط شکلِ ردیف را می‌سازد، بدون هیچ حالتی.

### حالت‌های داخلی

```js
const [items, setItems]     = useState(initialItems);    // ← از سرور
const [content, setContent] = useState(initialContent);  // ← از سرور
const [loading, setLoading] = useState(false);
const [loadError, setLoadError] = useState('');
const [catalogueComplete, setCatalogueComplete] = useState(fullCatalogue);
const [cart, setCart]       = useState([]);              // ← همیشه خالی
const [hydrated, setHydrated] = useState(false);
const [grind, setGrind]     = useState('whole');
```

دو تای اول با مورد ۲۶ عوض شدند: پیش‌تر خالی شروع می‌شدند و یک افکت موقع
mount از سرور می‌گرفتشان (`loading` هم برای همین `true` شروع می‌شد). حالا
داده روی سرور خوانده و به‌شکل پارامتر تحویل داده می‌شود.

سه تای بعدی تازه‌اند و هر سه به یک چیز مربوط‌اند: **سبد نباید بی‌صدا پاک
شود**.

**و یکی از این فهرست بیرون رفت.** تا پیش از این یک
`const [toastMsg, setToastMsg] = useState('')` هم اینجا بود. توست حالا
در `lib/toastStore.js` زندگی می‌کند و از این کانتکست فقط یک پوششِ
دوخطی مانده، تا ده صداکنندهٔ فعلی دست نخورند:

```js
/* خودِ توست دیگر حالتِ این کانتکست نیست و در
   lib/toastStore.js زندگی می‌کند — تا مودالِ کالا هم،
   که بیرون از این Provider رندر می‌شود، بتواند پیام
   بدهد. */
const toast = useCallback((msg) => showToast(msg), []);
```

دلیل کاملش پای `lib/toastStore.js` در همین فصل، و در تصمیم ۲۶ فصل ۹.

### سبد و hydration — سه نگهبان

سبد پیش‌تر در همان اولین رندر خوانده می‌شد: `useState(loadCart)`. زیر
رندر سمت سرور این یک خط سه مسئله می‌سازد و هر سه به یک نتیجه می‌رسند:

۱) روی سرور `localStorage` وجود ندارد.
۲) اگر سرور سبد خالی بفرستد و مرورگر در همان رندر اول سبد پُر بسازد،
   ری‌اکت ناسازگاری می‌بیند.
۳) افکتِ ذخیره اگر پیش از افکتِ خواندن اجرا شود، آرایهٔ خالیِ اولیه را روی
   سبدِ ذخیره‌شده می‌نویسد.

جواب سه نگهبان است:

```js
/* یک بار، فقط بخوان */
useEffect(() => {
  const saved = loadCart(browserStorage());
  if (saved.length) setCart(saved);
  setHydrated(true);
}, []);

/* پیش از خواندن، هیچ‌وقت ننویس */
useEffect(() => {
  if (!hydrated) return;
  saveCart(browserStorage(), cart);
}, [cart, hydrated]);
```

و نگهبان سوم `catalogueComplete` است، که پای افکت پاک‌سازی توضیح داده
می‌شود.

بهایش یک فریم است: تا اجرا نشدن افکت، شمارندهٔ سبد در هدر «۰ گرم» است.
این تفاوت واقعی با نسخهٔ قبل است و عمداً با `suppressHydrationWarning`
پنهان نشده — آن پرچم هشدار را خاموش می‌کند، نه مسئله را.
`tests/cart-hydration.test.jsx` یک چرخهٔ کاملِ «رندر سرور ← hydrate» را
اجرا می‌کند و هر سه شکست را جدا می‌سنجد.

### `reload()` — دیگر موقع mount صدا زده نمی‌شود

```js
const [data, texts] = await Promise.all([
  api.items(),
  api.content().catch(() => ({}))
]);
```

`.catch(() => ({}))` روی محتوا اما نه روی کالاها. کامنت دلیل را می‌گوید:
«متن‌ها نباید فهرست کالاها را زمین بزنند؛ اگر نیامدند بخش‌های متنی رندر
نمی‌شوند ولی فروشگاه کار می‌کند.» این یک تصمیم **تنزل مطبوع**
(graceful degradation) است.

### ساختارهای مشتق

```js
const bySlug = useMemo(() => new Map(items.map((i) => [i.slug, i])), [items]);
const lookup = useCallback((slug) => bySlug.get(slug), [bySlug]);

const byKind = useMemo(() => {
  const out = { coffee: [], gear: [], powder: [] };
  for (const it of items) if (out[it.kind]) out[it.kind].push(it);
  return out;
}, [items]);

const houseBlends = useMemo(
  () => (byKind.coffee || []).filter((c) => c.isBlend && c.house).sort((a, b) => a.rank - b.rank),
  [byKind]
);
```

`Map` به‌جای `find()` تکراری: در سبدی با ۱۰ ردیف و ۱۰۶ کالا،
`find()` یعنی حداکثر ۱۰۶۰ مقایسه؛ `Map.get()` یعنی ۱۰ عملیات O(1).

### افکت پاک‌سازی سبد

```js
useEffect(() => {
  if (!hydrated || !catalogueComplete || loading || items.length === 0) return;
  setCart((prev) => {
    const kept = prev.filter(
      (l) => bySlug.has(l.slug) && (l.mix || []).every((m) => bySlug.has(m.slug))
    );
    return kept.length === prev.length ? prev : kept;
  });
}, [hydrated, catalogueComplete, loading, items.length, bySlug]);
```

خط آخرِ درون `setCart` مهم است: اگر چیزی حذف نشد، **همان آرایهٔ قبلی**
برگردانده می‌شود نه یک آرایهٔ تازه. این از rerender بی‌مورد و حلقهٔ
بی‌نهایت افکت جلوگیری می‌کند.

**ولی دو شرط اولِ افکت مهم‌ترند، و هر دو با مورد ۲۶ اضافه شدند.**

این افکت هر ردیفی را که کالایش در `bySlug` نیست حذف می‌کند — منطقی، چون
مدیر ممکن است کالایی را خاموش کرده باشد. مشکل آنجاست که صفحهٔ یک کالا
عمداً **فهرست ناقص** می‌گیرد: فقط خودِ کالا و دانه‌های میکسش، نه صد و شش
کالا. بدون شرطِ `catalogueComplete`، همین یک بازدید کل سبد مشتری را پاک
می‌کرد.

و یک لایهٔ دیگر هم لازم بود. نگه داشتنِ ردیف در سبد کافی نیست: `resolved`
ردیف‌ها را با سند کالا جفت می‌کند و ردیفِ بی‌سند را کنار می‌گذارد — و
`CartDrawer` بدنهٔ سفارش را از همان `resolved` می‌سازد. یعنی سبد در حافظه
سالم می‌ماند ولی **سفارش با ردیف‌های کمتر ثبت می‌شد**، بی‌صدا. برای همین
افکتی هست که اگر سبد به کالایی بی‌رد اشاره کند، فهرست را کامل می‌کند:

```js
useEffect(() => {
  if (!hydrated || catalogueComplete || fillTried.current || cart.length === 0) return;
  const missing = cart.some(
    (l) => !bySlug.has(l.slug) || (l.mix || []).some((m) => !bySlug.has(m.slug))
  );
  if (!missing) return;
  fillTried.current = true;
  reload();
}, [hydrated, catalogueComplete, cart, bySlug, reload]);
```

برای بازدیدکنندهٔ بی‌سبد — یعنی بیشترشان — این افکت هیچ کاری نمی‌کند و
صفحهٔ کالا سبک می‌ماند.

### عملیات سبد

| تابع | امضا | کار |
|---|---|---|
| `addWeighed` | `(slug, grams, opts)` | افزودن/جمع‌زدن ردیف وزنی |
| `addPiece` | `(slug, qty=1)` | افزودن/جمع‌زدن ابزار |
| `changeWeight` | `(key, delta)` | تغییر وزن با کف `minWeight` |
| `changeQty` | `(key, delta)` | تغییر تعداد با کف ۱ |
| `setLineGrind` | `(key, nextGrind)` | تغییر آسیاب + **ادغام ردیف‌های همسان** |
| `removeLine` | `(key)` | حذف با toast مناسب نوع کالا |
| `clearCart` | `()` | خالی کردن |

`setLineGrind` پیچیده‌ترین است چون تغییر آسیاب، **کلید ردیف را عوض
می‌کند** و ممکن است با ردیف دیگری یکی شود:

```js
const twin = prev.findIndex((l, idx) => idx !== i && l.key === newKey);

if (twin === -1) { /* کلید تازه یکتاست */ }

/* ادغام: وزن‌ها جمع می‌شوند و ردیف تکراری حذف */
return prev
  .map((l, idx) => idx === twin ? { ...l, grams: l.grams + line.grams, qty: l.qty + line.qty } : l)
  .filter((_, idx) => idx !== i);
```

### مقادیر مشتق برای نمایش

```js
const resolved = useMemo(
  () => cart.map((l) => ({ ...l, item: bySlug.get(l.slug) })).filter((l) => l.item),
  [cart, bySlug]
);

const totals = useMemo(() => computeTotals(resolved, lookup), [resolved, lookup]);
```

`resolved` ردیف سبد را با سند کالا جفت می‌کند — همان شکلی که
`computeTotals` انتظار دارد. `filter((l) => l.item)` لایهٔ دفاعی دومی
است در برابر کالاهای حذف‌شده.

```js
const nextTier = useMemo(() => {
  if (totals.grams <= 0) return null;
  return [...TIERS].reverse().find((t) => t.min > totals.grams) || null;
}, [totals.grams]);
```

`TIERS` نزولی است (۵۰۰۰، ۳۰۰۰، ۱۰۰۰، ۰)؛ `reverse()` آن را صعودی می‌کند
و `find(t => t.min > grams)` **نزدیک‌ترین پلهٔ بعدی** را می‌دهد. با ۶۰۰
گرم، جواب پلهٔ ۱۰۰۰ است و سبد پیام می‌دهد: «۴۰۰ گرم دیگر اضافه کنید تا
تخفیف ۵٪ فعال شود.»

---

## `web/src/context/AuthContext.jsx`

**سه حالت:** `admin` (شیء یا `null`)، `checking` (بولی)، و توابع.

الگوی `checking` مهم است: بدون آن، در لحظهٔ اول بارگذاری `admin === null`
است و `AdminLayout` کاربر را به صفحهٔ ورود می‌فرستاد — حتی اگر توکن معتبر
داشت. با `checking`، صفحهٔ «در حال بررسی نشست…» نشان داده می‌شود تا
`api.me()` جواب بدهد.

---

## `web/src/lib/format.js`

```js
export const toFa = (n) => Number(n || 0).toLocaleString('fa-IR');
export const money = (n) => toFa(n) + ' تومان';

export function formatWeight(g) {
  if (g < 1000) return toFa(g) + ' گرم';
  const kg = g / 1000;
  return toFa(Number.isInteger(kg) ? kg : kg.toFixed(2)) + ' کیلوگرم';
}
```

`toLocaleString('fa-IR')` دو کار همزمان می‌کند: رقم‌ها را فارسی می‌کند و
جداکنندهٔ هزارگان می‌گذارد. `1850000` می‌شود `۱٬۸۵۰٬۰۰۰`.

`formatWeight` نکتهٔ ظریفی دارد: `Number.isInteger(kg)` تعیین می‌کند
`۲ کیلوگرم` نوشته شود یا `۱٫۵۰ کیلوگرم`.

`faDate` از `Intl.DateTimeFormat('fa-IR')` استفاده می‌کند که تقویم شمسی
بومی مرورگر است — پس در **کلاینت** نیازی به `jalali.js` نیست. سرور آن را
لازم دارد چون باید بازه‌ها را روی مرز روزهای شمسی ببندد.

`toLatinDigits` قرینهٔ `toLatin` در `server/src/lib/track.js` است: هر
جایی که کاربر عدد تایپ می‌کند (وزن، قیمت، شمارهٔ موبایل، شمارهٔ سفارش)
باید رقم فارسی هم پذیرفته شود.

---

## `web/src/lib/cartLine.js` — شکل یک ردیف سبد

**صادرات:** `mixSignature`، `lineKey`، `normalizeMix`، `buildLine`.

بدون هیچ حالتی و بدون React — یعنی هم `BlendsSection` (اهرم‌ها) و هم
`MixVisual` (حالت تصویری) از همین‌جا رد می‌شوند و تضمین «یک میکس، از هر
راهی که ساخته شود، دقیقاً همان ردیف سبد» تست‌پذیر می‌ماند.

```js
export function mixSignature(mix) {
  if (!Array.isArray(mix) || mix.length === 0) return '';
  return [...mix]
    .filter((m) => Number(m.percent) > 0)
    .map((m) => `${m.slug}:${Math.round(Number(m.percent) || 0)}`)
    .sort()
    .join(',');
}

export const lineKey = (slug, grind, mix) => `${slug}|${grind || ''}|${mixSignature(mix)}`;
```

`.sort()` حیاتی است: ترکیب `[cerrado 60, monsooned 40]` و
`[monsooned 40, cerrado 60]` باید **یک امضا** بدهند، وگرنه دو ردیف
تکراری در سبد می‌ساختند. توجه کنید که مرتب‌سازی فقط داخل *امضا* اتفاق
می‌افتد، نه روی خودِ آرایه.

`normalizeMix` دانه‌های صفرشده را کنار می‌گذارد و درصدها را گِرد می‌کند:

```js
export function normalizeMix(item, mix) {
  if (!item?.isBlend) return [];
  if (Array.isArray(mix) && mix.length) {
    return mix
      .filter((m) => Number(m.percent) > 0)
      .map((m) => ({ slug: m.slug, percent: Math.round(Number(m.percent)) }));
  }
  return (item.components || []).map((c) => ({ slug: c.slug, percent: c.percent }));
}
```

ترتیب دانه‌ها **همان ترتیب ورودی می‌ماند** و عمداً مرتب نمی‌شود — حالت
تصویری با همین ترتیب کیسه‌ها را می‌ریزد.

`buildLine` هم آسیاب را فقط برای قهوه می‌گذارد (پودر آسیاب نمی‌خورد) و
ردیف نهایی را با کلیدش برمی‌گرداند:

```js
export function buildLine(item, grams, opts = {}, fallbackGrind = '') {
  const grind = item.grindable ? (opts.grind ?? fallbackGrind) : '';
  const mix = normalizeMix(item, opts.mix);
  return { key: lineKey(item.slug, grind, mix), slug: item.slug,
           kind: item.kind, grams, qty: 0, grind, mix };
}
```

---

## `web/src/lib/blendVisual.js` — ریاضی و زمان‌بندی حالت تصویری

**صادرات:** `STAGES`، `STAGE_TITLE`، `stageMessage`، `POUR_BUDGET`،
`POUR_MIN`، `MIX_MS`، `SETTLE_MS`، `pourPlan`، `pourTotal`، `SCENE`،
`sackLayout`، `hopperLevel`، `prefersReducedMotion`.

**هیچ درصدی اینجا حساب نمی‌شود.** هرچه به درصدها مربوط است از
`applyPercent` در `lib/blend.js` می‌آید و همان‌جا می‌ماند. آنچه اینجاست
تصمیم‌های *نمایشی* است — و همه تابع خالص‌اند تا بشود بدون مرورگر
تستشان کرد و تا هیچ‌کدام لازم نباشد فریم‌به‌فریم در جاوااسکریپت حساب
شوند. عددها یک بار درمی‌آیند و بقیه‌اش کار CSS است.

**بودجهٔ زمانی به‌جای زمانِ هر کیسه.** کل مرحلهٔ ریختن باید چند ثانیه
باشد، نه چند ثانیه به‌ازای هر کیسه:

```js
export const POUR_BUDGET = 2600;   // میلی‌ثانیه، کل مرحلهٔ ۲
export const POUR_MIN = 320;       // کوتاه‌ترین ریختنِ قابل‌دیدن
```

`pourPlan` این بودجه را بین کیسه‌ها به نسبت سهمشان پخش می‌کند، با یک کفِ
کوتاه تا کیسهٔ ۵٪ هم دیده شود:

```js
const share = live.length * min >= budget;   // بودجه به کفِ همه نمی‌رسد
const extra = budget - live.length * min;
const ms = share
  ? Math.round(budget / live.length)          // مساوی پخش کن
  : Math.round(min + (percent / sum) * extra);
```

و باقیماندهٔ گِردکردن روی آخرین کیسه می‌نشیند تا جمعِ زمان **دقیقاً**
همان بودجه باشد و مرحلهٔ ۲ کِش نیاید — چیزی که `blend-visual.test.js`
مستقیماً می‌سنجد.

**هندسهٔ صحنه.** `SCENE` یک SVG با دستگاهِ سمت چپ و کیسه‌های سمت راست
توصیف می‌کند: جهت خواندن فارسی از راست به چپ است، پس قهوه هم از راست به
سمت دستگاه می‌رود. `first: 296` مرکز راست‌ترین کیسه (اولین انتخاب) است.

ظریف‌ترین محاسبهٔ فایل در `sackLayout` است. کیسه حول پایه‌اش می‌چرخد، پس
با چرخشِ `tilt` دهانه‌اش از پایه فاصله می‌گیرد — و مقدار این فاصله به
**بزرگیِ** کیسه بستگی دارد:

```js
const rad = (scene.tilt * Math.PI) / 180;
const up = [Math.sin(rad), -Math.cos(rad)];
const reach = scene.mouth * scale;

hx: scene.hopper.x - reach * up[0],
hy: scene.hopper.y - reach * up[1]
```

برای اینکه دهانهٔ *هر* کیسه — کوچک و بزرگ — دقیقاً سر قیف بایستد، پایه‌اش
به‌اندازهٔ همین بردار عقب برده می‌شود. بدون این، کیسهٔ کوچک بالای هوا
خالی می‌کرد.

**کم‌حرکتی.** `prefersReducedMotion()` تنها جایی است که به `window` دست
می‌زند (با نگهبان `typeof window !== 'undefined'` تا در محیط node تست
بشکند نه). اگر روشن باشد، هیچ مرحله‌ای تایمر ندارد: با یک کلیک مستقیم به
نتیجه می‌رسد — همان بسته، همان قیمت، همان ردیف سبد، فقط بدون نمایش.

---

## `web/src/lib/useReveal.js`

```js
export function useReveal(deps = []) {
  useEffect(() => {
    const cards = [...document.querySelectorAll('.card:not(.is-in)')];
    if (cards.length === 0) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cards.forEach((c) => c.classList.add('is-in'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (!e.isIntersecting) return;
        setTimeout(() => e.target.classList.add('is-in'), i * 55);
        observer.unobserve(e.target);
      });
    }, { threshold: 0.12 });

    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, deps);
}
```

سه نکته:
- `:not(.is-in)` یعنی کارت‌هایی که قبلاً وارد شده‌اند دوباره رصد نمی‌شوند.
- `prefers-reduced-motion` **قبل از** ساختن observer بررسی می‌شود و
  کارت‌ها فوراً نمایان می‌شوند.
- `i * 55` تأخیر پلکانی می‌سازد؛ `unobserve` بعد از ورود، کار observer را
  کم می‌کند.

این یکی از معدود جاهایی است که پروژه مستقیماً با DOM کار می‌کند (به‌جای
state) — انتخاب آگاهانه‌ای برای اینکه ۱۰۶ کارت با هر اسکرول rerender
نشوند.

---

# بخش ج — وب: کامپوننت‌های فروشگاه

## `Header.jsx`
هدر چسبان با لوگوی SVG دست‌نویس، ۱۰ لینک لنگری در آرایهٔ `LINKS`، دکمهٔ
سبد که `cartSummary(true)` را نشان می‌دهد، و دکمهٔ برگر با
`aria-expanded`/`aria-controls`.

**لنگرها بیرون از صفحهٔ اصلی.** همهٔ آن ۱۰ لینک به بخش‌های صفحهٔ اصلی
اشاره می‌کنند. روی خودِ صفحهٔ اصلی، لنگر ساده درست‌ترین کار است؛ ولی روی
صفحهٔ اختصاصی کالا لنگرِ تنها هیچ کاری نمی‌کند. پس شکلِ لینک از مسیر
فعلی تصمیم گرفته می‌شود:

```js
const onHome = usePathname() === '/';
```

روی صفحهٔ اصلی `<a href="#products">` و جای دیگر `<Link href="/#products">`.

**و یک لینک سوم در `header-actions`: پیگیری سفارش.**

```jsx
<Link className="btn-track" href="/track" aria-label="پیگیری سفارش">
  <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">…</svg>
  <span>پیگیری سفارش</span>
</Link>
```

تا پیش از این فقط فوتر و خودِ رسید به `/track` راه داشتند؛ مشتریِ برگشته
باید تا ته صفحه اسکرول می‌کرد تا سفارشش را پیدا کند. حالا همان‌جایی است
که چشم دنبال کارِ حساب می‌گردد — کنارِ سبد. لینکِ فوتر سر جایش ماند: کسی
که به ته صفحه رسیده هم نباید برگردد بالا.

`aria-label` روی خودِ لینک لازم است و نه فقط روی آیکن، چون زیر ۷۶۰
پیکسل برچسبِ متنی `display: none` می‌شود و از درختِ دسترس‌پذیری هم بیرون
می‌رود — آن‌وقت لینک بی‌نام می‌ماند:

```css
.btn-cart span,
.btn-track span { display: none; }
```

## `Hero.jsx` — «ترازوی قیمت»

امضای بصری صفحه. یک `<select>` با `<optgroup>` بر پایهٔ دستهٔ رست، یک
اسلایدر ۱۰۰ تا ۲۰۰۰ گرم با گام ۵۰، و نمایش زندهٔ قیمت.

```js
useEffect(() => {
  if (coffees.length === 0) return;
  if (!coffees.some((c) => c.slug === slug)) {
    const first = [...coffees].sort((a, b) => a.rank - b.rank)[0];
    setSlug(first.slug);
  }
}, [coffees, slug]);
```

این افکت دو کار می‌کند: انتخاب خودکار اولین قهوه در بارگذاری، و
بازیابی اگر قهوهٔ انتخاب‌شده حذف شود.

عدد `{toFa(coffees.length)} قهوه` در «hero-facts» زنده است و با تعداد
واقعی کالاها عوض می‌شود.

## `CatalogSection.jsx` — یک کامپوننت برای سه فهرست

```jsx
<CatalogSection kind="coffee" id="products" eyebrow="فهرست این هفته" ... />
<CatalogSection kind="gear"   id="gear"     eyebrow="قفسهٔ ابزار" ... />
<CatalogSection kind="powder" id="powders"  eyebrow="غیر از قهوه" ... />
```

همهٔ تفاوت‌ها از `KINDS[kind]` می‌آید و بقیه prop است.

**جست‌وجوی debounce شده:**

```js
const timer = useRef(null);
useEffect(() => {
  clearTimeout(timer.current);
  timer.current = setTimeout(() => setQuery(queryInput), 160);
  return () => clearTimeout(timer.current);
}, [queryInput]);
```

دو state جدا (`queryInput` برای input و `query` برای فیلتر) الگوی
استاندارد debounce کنترل‌شده است.

**فیلتر و مرتب‌سازی:**

```js
const hay = (p) => [p.name, p.origin, p.spec, ...p.notes, ...p.pairs,
                    meta.groups[p.group]?.label || ''].join(' ');
list = list.filter((p) => hay(p).includes(q));
```

جست‌وجو در شش منبع، از جمله برچسب فارسی دسته — پس «رست تیره» هم نتیجه
می‌دهد.

```js
const by = {
  rank:         (a, b) => a.rank - b.rank,
  'price-asc':  (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  'meter-asc':  (a, b) => a.meter - b.meter || a.rank - b.rank,
  'meter-desc': (a, b) => b.meter - a.meter || a.rank - b.rank,
  name:         (a, b) => a.name.localeCompare(b.name, 'fa')
};
```

`|| a.rank - b.rank` مرتب‌سازی پایدار می‌سازد؛ `localeCompare(_, 'fa')`
الفبای فارسی را درست مرتب می‌کند (نه ترتیب کد یونیکد).

**حالت گروه‌بندی‌شده:**

```js
const grouped = filter === 'all' && sort === 'rank' && !query.trim();
```

فقط وقتی هیچ فیلتری فعال نیست، کالاها زیر عنوان دسته‌شان دسته‌بندی
می‌شوند. کامنت: «وقتی همه‌چیز نمایش داده می‌شود و ترتیب پیشنهادی است،
کالاها دسته‌بندی‌شده نشان داده می‌شوند.»

## `ItemCard.jsx`

یک کارت برای هر سه نوع. تفاوت‌ها از `KINDS[item.kind]` می‌آید:

```js
const CARD_CLASS = { coffee: 'card', gear: 'card card-gear', powder: 'card card-powder' };
```

**نمایش موجودی.** کارت سه حالت را از هم جدا می‌کند: نامحدود (هیچ نشانه‌ای
نشان نمی‌دهد)، موجودِ شمرده‌شده (عدد باقی‌مانده)، و ناموجود:

```js
const soldOut = isSoldOut(item);
...
{soldOut ? <span className="badge badge-out">ناموجود</span> : null}
...
<button disabled={soldOut}>{soldOut ? 'ناموجود' : 'افزودن'}</button>
```

همین منطق در `Hero.jsx` («ترازوی قیمت») هم هست. توجه کنید که این فقط
**پیشگیری در رابط کاربری** است؛ حرف آخر را رزرو اتمی سمت سرور می‌زند و
اگر کالا بین بارگذاری صفحه و ثبت سفارش تمام شود، پاسخ ۴۰۹ می‌آید.

**همگام‌سازی آسیاب:**

```js
const [pick, setPick] = useState(grind);
const [touched, setTouched] = useState(false);

useEffect(() => { if (!touched) setPick(grind); }, [grind, touched]);
```

کامنت توضیح می‌دهد: «آسیاب این کارت با پیش‌فرض سایت شروع می‌شود و اگر
مشتری از بخش «روش دم‌آوری» پیش‌فرض را عوض کند، کارت‌هایی که دست نخورده‌اند
هم همراهش می‌آیند.» یعنی وقتی کاربر روی کارت «اسپرسو» در بخش دم‌آوری
می‌زند، همهٔ کارت‌های دست‌نخورده به آسیاب اسپرسو می‌روند اما کارتی که
خودش انتخاب کرده دست‌نخورده می‌ماند.

**قیمت میکس:**

```js
const perKg = item.isBlend ? blendPrice(item, item.components) : item.price;
```

روی کارت، قیمت میکس با **ترکیب رسمی** حساب می‌شود؛ در بخش میکس‌ها با
ترکیب دلخواه کاربر.

## `ItemDetail.jsx`

مودال معرفی. تابع صادرشدهٔ `hasStory` توسط `ItemCard` استفاده می‌شود تا
تصمیم بگیرد دکمهٔ «دربارهٔ این قهوه» را نشان دهد یا نه:

```js
export const hasStory = (item) => Boolean(item?.story || item?.taste || item?.recommend);
```

سه بلوک با `.filter((b) => b.text)` ساخته می‌شوند، پس بخش خالی اصلاً
رندر نمی‌شود.

مدیریت فوکوس و اسکرول در `useEffect`:

```js
lastFocus.current = document.activeElement;
document.body.style.overflow = 'hidden';
panel.current?.focus();
// ...
return () => {
  document.body.style.overflow = '';
  document.removeEventListener('keydown', onKey);
  lastFocus.current?.focus?.();
};
```

**نوار کنش‌های بالای پنجره.** کنارِ دکمهٔ بستن، دکمهٔ هم‌رسانی هم اینجاست:

```jsx
<div className="sheet-actions">
  <ShareButton item={item} className="sheet-share" />
  <button className="btn-close sheet-close" onClick={onClose} aria-label="بستن">×</button>
</div>
```

جایش تصادفی نیست. بیشترِ بازدیدکننده‌ها کالا را از همین پنجره می‌بینند،
نه از صفحهٔ کامل؛ نبودنِ دکمه اینجا یعنی نبودنِ **عملیِ** قابلیت. و از
مورد ۲۷ به بعد این پنجره آدرس واقعی خودش را دارد، پس چیزی که فرستاده
می‌شود همان آدرسی است که در نوار مرورگر است.

> **نکته**
> این پنجره در شکافِ `@modal` رندر می‌شود، یعنی **بیرون از
> `ShopProvider`**. برای همین `ShareButton` تأییدش را از انبارهٔ ماژولیِ
> `lib/toastStore.js` می‌گیرد و نه از `useShop()`. نگهبانش
> `tests/item-detail.test.jsx` است: مودال را **بدون هیچ Provider ای**
> رندر می‌کند. اگر روزی چیزی داخل این پنجره دوباره به کانتکست وابسته
> شود، بقیهٔ تست‌ها سبز می‌مانند و فقط پرکاربردترین راهِ دیدنِ کالا
> می‌ترکد.

## `CartDrawer.jsx`

**۳۸۴ خط، سه حالت:** `cart` → `form` → رسید. حالت با ترکیب `step` و
`done` تعیین می‌شود:

```jsx
{done ? <Receipt .../> : step === 'form' ? <فرم/> : <فهرست سبد/>}
```

**بازنشانی با تأخیر:**

```js
setTimeout(() => { setStep('cart'); setError(''); setDone(null); }, 350);
```

۳۵۰ میلی‌ثانیه صبر می‌کند تا انیمیشن بسته شدن کشو تمام شود، وگرنه کاربر
می‌دید که محتوا وسط انیمیشن عوض می‌شود.

کامپوننت `Receipt` **از پاسخ سرور** ساخته می‌شود نه از سبد. حتی شمارهٔ
تماس فروشگاه از `content.about` خوانده می‌شود:

```jsx
<Receipt order={done} shop={content?.about} />
```

با کامنت: «راه تماس — از «دربارهٔ ما» خوانده می‌شود تا اگر مدیر شماره
را عوض کرد، رسید هم به‌روز باشد.»

**و همان رسید یک بار دیگر رندر می‌شود** — این بار داخل `PrintSheet`،
که آن را به‌شکل فرزندِ **مستقیم** `body` می‌گذارد:

```jsx
<div className="drawer-body">
  <Receipt order={done} shop={content?.about} />
</div>

/* همان رسید، این بار فرزند مستقیم body — تنها چیزی که چاپگر می‌بیند */
<PrintSheet>
  <Receipt order={done} shop={content?.about} />
</PrintSheet>

<div className="drawer-foot">
  <button className="btn btn-primary btn-block" onClick={() => window.print()}>
    چاپ یا ذخیرهٔ رسید
  </button>
  …
</div>
```

دو بار رندر شدن اسراف به‌نظر می‌رسد و نیست: یکی از آن دو روی صحنه
`display: none` است و هیچ‌وقت هم‌زمان با دیگری دیده نمی‌شود. چراییِ
کاملش پای `PrintSheet.jsx` در همین فصل، و در تصمیم ۲۷ فصل ۹.

## `Receipt.jsx` — یک شکل، دو صداکننده

**۲۰۵ خط.** از `CartDrawer` بیرون کشیده شد، چون **دو جا** همین برگه را
نشان می‌دهند: کشوی سبد بعد از ثبت سفارش، و صفحهٔ پیگیری برای کسی که
رسیدش را بسته است. اگر دو نسخه می‌شد، روزی یکی «تخفیف وزنی» را نشان
می‌داد و دیگری نه.

چهار پارامتر تفاوت‌های آن دو جا را می‌پوشانند:

| پارامتر | پیش‌فرض | چرا هست |
|---|---|---|
| `heading` | «سفارش شما ثبت شد» | در کشو خبرِ ثبت است، در پیگیری فقط عنوانِ سند: «رسید سفارش» |
| `showMark` | `true` | تیکِ سبز فقط وقتی معنی دارد که همین الان ثبت شده باشد — سفارشِ لغو‌شده تیک نمی‌خواهد |
| `statusLabel` | `''` | وضعیت سفارش؛ فقط صفحهٔ پیگیری آن را می‌داند |
| `showTracking` | `true` | لینکِ «وضعیت سفارش را ببینید» روی خودِ صفحهٔ پیگیری بی‌معنی است |

**دو شکلِ داده که هر دو باید کار کنند.** پاسخ `POST /api/orders` کامل
است — با نشانی و تلفن؛ پاسخ `GET /api/orders/track` نمای عمومی است و
عمداً نشانی و تلفن و توضیح را ندارد (`server/src/lib/track.js`). برای
همین هر تکه‌ای که ممکن است نباشد شرط دارد، و یک شرطِ ترکیبی هم هست تا
بلوکِ «تحویل به» برای یک نامِ تنها یک قابِ خالی نسازد:

```js
const hasDelivery = Boolean(customer?.phone || customer?.address);
```

```jsx
<h4 className="receipt-h">{hasDelivery ? 'تحویل به' : 'به نام'}</h4>
```

و در رسید، وزن هر دانهٔ میکس محاسبه می‌شود:

```jsx
<small>{formatWeight(Math.round((l.grams * m.percent) / 100))}</small>
```

یعنی مشتری می‌بیند «سرادو ۶۰٪ — ۳۰۰ گرم». کلیدِ حلقهٔ میکس هم عمداً
شماره است نه `slug`: نمای عمومیِ پیگیری فقط نام و درصد می‌دهد.

## `PrintSheet.jsx` — میزبانِ چاپ

**۶۷ خط، یک `useState` و یک portal.** کوچک‌ترین کامپوننت پروژه، و
جانشینِ ترفندی که ۳۳ صفحه کاغذ سفید می‌داد.

```jsx
const FLAG = 'has-print-sheet';

export default function PrintSheet({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    document.body.classList.add(FLAG);
    return () => document.body.classList.remove(FLAG);
  }, []);

  if (!ready) return null;

  return createPortal(
    <div className="print-sheet" aria-hidden="true">{children}</div>,
    document.body
  );
}
```

**مسئله‌ای که حل می‌کند.** نسخهٔ پیشین رسید را با
`visibility: hidden` روی `body *` چاپ می‌کرد و فقط کشوی سبد را
برمی‌گرداند. `visibility` عنصر را از **چیدمان** حذف نمی‌کند: کل فروشگاه
— هدر، سه فهرست کالا، کارت‌ها و SVGهایشان، متن‌ها و فوتر — همچنان
ارتفاعِ واقعیِ خودشان را داشتند و مرورگر همان ارتفاع را صفحه‌بندی
می‌کرد. نتیجه اندازه‌گیری شد: **۳۳ صفحه، که ۳۱ تای آخرش خالی بود.**

`display: none` این را حل می‌کند، ولی نمی‌شود مستقیم روی نیاکانِ رسید
زدش — رسید چند لایه داخل درخت است و پنهان‌کردنِ هر نیایی خودش را هم
می‌برد. پس رسید یک بار دیگر و به‌شکل فرزندِ **مستقیمِ** `body` رندر
می‌شود، و آن‌وقت قاعدهٔ چاپ یک خط است.

**سه جزئیات که هر کدام یک اشکال را می‌بندند:**

**۱) `ready`.** `createPortal` به `document` نیاز دارد و روی سرور چنین
چیزی نیست. تا وقتی mount نشده هیچ چیزی برنمی‌گرداند، پس HTML سرور و
اولین رندر مرورگر یکی‌اند و `hydrate` شکایتی ندارد.

**۲) `aria-hidden`.** روی صحنه این میزبان `display: none` است، ولی
صفحه‌خوان نباید همان رسید را دو بار بخواند.

**۳) `FLAG` روی `body`.** بدون این نشانه، قاعدهٔ «هر فرزند body به‌جز
میزبان را بردار» روی **هر** صفحه‌ای اجرا می‌شد و `Ctrl+P` روی خودِ
فروشگاه یک برگ سفید می‌داد. با آن، قاعده فقط وقتی زنده است که واقعاً
رسیدی برای چاپ وجود داشته باشد — و پاک‌سازیِ `useEffect` برش می‌دارد.

سبکِ چاپ در ۸.۱۰ خط‌به‌خط آمده.

## `ShareButton.jsx` — «برای دوستت بفرست»

**۷۹ خط.** روی سه جا می‌نشیند و در هر سه همان یک کار را می‌کند:

| جا | کلاس | از کجا رندر می‌شود |
|---|---|---|
| کارت فهرست | `card-share` | `ItemCard.jsx`، در ردیفِ عنوان |
| صفحهٔ اختصاصی کالا | `card-share` | همان کارت، از راه `ItemBuyCard` |
| مودالِ رهگیری‌شده | `sheet-share` | `ItemDetail.jsx`، در `sheet-actions` |

منطقِ آدرس و کپی اینجا نیست، در `lib/share.js` است. آنچه اینجا می‌ماند
چهار چیز است و هر چهار عمدی:

```jsx
const onShare = async (e) => {
  e.preventDefault();
  e.stopPropagation();

  if (busy) return;
  setBusy(true);
  try {
    const { mode } = await shareItem(item);
    if (mode === 'copied') toast(SHARE_COPIED);
    else if (mode === 'failed') toast(SHARE_FAILED);
  } finally {
    setBusy(false);
  }
};
```

**۱) `<button type="button">` واقعی است**، نه `<a>` و نه `div`
کلیک‌پذیر: نه ناوبری می‌کند و نه فرمی را می‌فرستد.

**۲) `stopPropagation` دارد**، چون داخل کارتی می‌نشیند که پر از کنترل
است؛ کلیکش نباید به هیچ‌چیز دیگری برسد. `tests/item-card.test.jsx`
همین را می‌سنجد.

**۳) دو حالتِ ساکت.** `shared` و `canceled` هیچ توستی نمی‌دهند — اولی
چون برگهٔ سیستم خودش بازخورد داده، دومی چون کاربر نخواست.

**۴) `aria-label` نام کالا را دارد**، وگرنه در فهرستی از صد کارت، صد
دکمهٔ «هم‌رسانی» بی‌تفاوت می‌شدند:

```jsx
aria-label={`هم‌رسانی ${item?.name || 'این کالا'}`}
```

و `busy` تا وقتی برگهٔ سیستم باز است دکمه را قفل می‌کند تا دو بار
پشت‌سرهم زده نشود.

> **نکته**
> توست را از انبارهٔ ماژولی می‌گیرد، نه از `ShopContext`. همین یک خط
> است که می‌گذارد این دکمه داخل مودال هم کار کند، جایی که هیچ
> Provider ای بالای سرش نیست.

## `Toast.jsx` — بیست‌وهفت خط، و یک هوک

```jsx
export default function Toast() {
  const message = useSyncExternalStore(subscribeToast, getToast, getServerToast);

  return (
    <div className={`toast ${message ? 'is-on' : ''}`.trim()} role="status" aria-live="polite">
      {message}
    </div>
  );
}
```

`useSyncExternalStore` سه آرگومان می‌گیرد و هر سه از `toastStore.js`
می‌آیند: مشترک‌شدن، snapshot مرورگر، و snapshot سرور. آرگومان سوم
اختیاری است ولی اینجا **لازم** است — بدون آن Next موقع رندر سروری خطا
می‌دهد، و با آن تضمین می‌شود که HTML سرور همیشه یک توستِ خالی دارد.

`role="status"` و `aria-live="polite"` یعنی صفحه‌خوان پیام را می‌خواند
بدون اینکه کاری را که کاربر در دست دارد قطع کند. عنصر همیشه در DOM
هست و فقط کلاس `is-on` می‌گیرد، چون `opacity` باید بتواند گذار کند.

## `BlendsSection.jsx` — میزبان هر دو حالت

`BlendCard` پنج حالت محلی دارد: `mix`, `grams`, `pick` (آسیاب),
`detail`, و `visual`.

**`visual` تنها چیزی است که بین دو حالت فرق می‌کند.** `mix`، `grams` و
`pick` بالای هر دو می‌مانند، پس رفت‌وبرگشت بین حالت ساده و حالت تصویری
هیچ انتخابی را از دست نمی‌دهد. حالت ساده پیش‌فرض است:

```jsx
const [visual, setVisual] = useState(false);
...
{visual ? <MixVisual item={item} mix={mix} available={available}
                     canEdit={Boolean(item.customizable)}
                     onPercent={change} onDrop={drop} onJoin={join}
                     onAdd={add} error={error} /> : null}

{visual ? null : (<>{/* اهرم‌های نسبت */}<BeanPicker … /></>)}
```

`MixVisual` هیچ حالتی از خودش دربارهٔ ترکیب ندارد؛ همان `mix` را
می‌خواند و همان `change` (یعنی `applyPercent`) را صدا می‌زند. یعنی
منطق میکس **فورک نشده**، فقط دو نما گرفته است.

**دکمهٔ تعویض حالت** برچسبش کاری را می‌گوید که انجام می‌دهد
(«خودم ترکیب کنم» ↔ «حالت ساده»). کامنت توضیح می‌دهد چرا `aria-pressed`
اینجا نیست: با آن، صفحه‌خوان «حالت ساده، فشرده» می‌خواند که معنایش
برعکس است.

**تنها یک راه به سبد:**

```js
const add = useCallback(
  () => addWeighed(item.slug, grams, { grind: pick, mix }),
  [addWeighed, item.slug, grams, pick, mix]
);
```

دکمهٔ پاورقی در هر دو حالت سر جایش است و دکمهٔ پایانِ مرحلهٔ ۴ در
`MixVisual` دقیقاً همین `add` را صدا می‌زند. راه انداختن دستگاه یک خوشیِ
اختیاری است، نه دروازهٔ خرید.

**فهرست دانه‌های قابل افزودن:**

```js
const available = useMemo(
  () => (byKind.coffee || [])
    .filter((b) => !b.isBlend && b.slug !== item.slug && !mix.some((p) => p.slug === b.slug))
    .sort((a, b) => a.name.localeCompare(b.name, 'fa')),
  [byKind, item.slug, mix]
);
```

توجه: از **همهٔ قهوه‌ها** استفاده می‌کند، نه از `item.pool`. کامنت
می‌گوید: «هر قهوه‌ای که خودش میکس نباشد می‌تواند وارد ترکیب شود — مشتری
آزاد است، ترکیب ما فقط پیشنهاد است.» به همین دلیل فیلد `pool` عملاً
بی‌استفاده مانده.

**تشخیص دست‌کاری:**

```js
const changed = useMemo(() => {
  const base = startingMix(item);
  if (base.length !== mix.length) return true;
  return base.some((b) => mix.find((m) => m.slug === b.slug)?.percent !== b.percent);
}, [item, mix]);
```

فقط اگر `changed` باشد دکمهٔ «بازگشت به پیشنهاد ما» نشان داده می‌شود.

## `MixVisual.jsx` — حالت تصویری ساز میکس

**۴۸۵ خط.** یک صحنهٔ SVG با دستگاهِ ترکیب سمت چپ و کیسه‌های قهوه سمت
راست، در چهار مرحله:

| مرحله | کلید | چه اتفاقی می‌افتد |
|---|---|---|
| ۱ | `pick` | چیدن کیسه‌ها — درصدها همین‌جا تنظیم می‌شوند |
| ۲ | `pour` | کیسه‌ها یکی‌یکی در قیف خالی می‌شوند |
| ۳ | `mix` | کار دستگاه — کوتاه، با امکان رد کردن |
| ۴ | `done` | بستهٔ آماده، و دکمهٔ افزودن به سبد |

هیچ مرحله‌ای خودبه‌خود جلو نمی‌رود مگر مشتری بخواهد؛ مرحلهٔ ۱ تا وقتی
«شروع ترکیب» زده نشود همان‌جا می‌ماند.

**تنها یک تایمر در هر لحظه:**

```js
useEffect(() => {
  if (reduced) return undefined;
  if (stage === 'pour') {
    const cur = plan[poured];
    if (!cur) return undefined;
    const t = setTimeout(() => {
      const done = poured + 1;
      setPoured(done);
      if (done >= plan.length) setStage('mix');
    }, cur.ms);
    return () => clearTimeout(t);
  }
  if (stage === 'mix') {
    const t = setTimeout(() => setStage('done'), MIX_MS);
    return () => clearTimeout(t);
  }
  return undefined;
}, [stage, poured, plan, reduced]);
```

نه حلقهٔ `requestAnimationFrame` و نه محاسبهٔ فریم‌به‌فریم: جاوااسکریپت
فقط **مرزِ** مرحله‌ها را می‌زند و حرکت بین دو مرز کارِ CSS است. مدت هر
ریختن با یک متغیر CSS به صحنه داده می‌شود:

```jsx
<div className="mixv" data-stage={stage}
     style={{ '--pour': `${span}ms`, '--settle': `${SETTLE_MS}ms` }}>
```

پس هم انیمیشن کیسه و هم بالا آمدن قیف با **یک عدد** کوک می‌شوند و مو به
مو هم‌زمان تمام می‌شوند.

**بازنشانی هنگام تغییر ترکیب — حین رندر، نه در افکت:**

```js
const [ranWith, setRanWith] = useState(signature);
if (ranWith !== signature) {
  setRanWith(signature);
  setStage('pick');
  setPoured(0);
}
```

اگر ترکیب عوض شود (چه با اهرم‌های همین‌جا، چه در حالت ساده و بازگشت به
اینجا) آنچه دستگاه ساخته دیگر معتبر نیست. با `useEffect` کاربر یک فریم
بستهٔ *قبلی* را می‌دید و بعد پرش می‌خورد؛ این الگو — که خودِ React
اسمش را «تنظیم state در حین رندر» می‌گذارد — آن فریم را حذف می‌کند.

**قیف یک کیسه عقب نمی‌ماند:**

```js
const pouring = stage === 'pour' ? plan[poured] : null;
const filled = poured + (pouring ? 1 : 0);
const hopperTone = useMemo(() => mixTone(beans.slice(0, filled)), [beans, filled]);
const level = hopperLevel(plan, filled);
```

در مرحلهٔ ۲ کیسهٔ شمارهٔ `poured` وسط خالی شدن است، پس هم سطح قیف و هم
رنگش باید **شاملِ** همان کیسه باشد و در طول همان ریختن به مقصد برسد.

**رنگ از همان جدول کارت‌ها می‌آید.** `roastTone(meter)` و `mixTone(parts)`
از `art.js` صادر شده‌اند تا یک دانه در کارت و در ساز میکس دقیقاً یک رنگ
داشته باشد — نه یک کپیِ دوم از جدول رنگ رست.

**شناسهٔ یکتا برای `clipPath`:**

```js
const uid = useMemo(() => 'm' + String(item.slug).replace(/[^a-z0-9]/gi, ''), [item.slug]);
```

چند میکس می‌توانند هم‌زمان صحنهٔ خودشان را باز کرده باشند و شناسهٔ
`clipPath` در کل صفحه یکتا است، نه در هر SVG.

**دسترس‌پذیری.** خودِ صحنه برای صفحه‌خوان یک `role="img"` با شرح کوتاه
است؛ هر کاری که می‌شود کرد، دکمه و اهرمِ واقعیِ پایین است. یک ناحیهٔ
`aria-live="polite"` هم پیام هر مرحله را با لحن آرام می‌خواند:

```js
stageMessage('pour')  // «مرحلهٔ ۲ از ۴ — کیسه‌ها یکی‌یکی در دستگاه خالی می‌شوند»
```

و وقتی بسته می‌رسد، تمرکز صفحه‌کلید روی دکمهٔ «افزودن به سبد» می‌نشیند —
پایانِ مسیر همان‌جایی است که مشتری برایش آمده:

```js
useEffect(() => {
  if (stage === 'done') addRef.current?.focus({ preventScroll: true });
}, [stage]);
```

چهار برچسب مرحله کنار هم در کارتِ باریک بریده می‌شد، پس نوار مرحله فقط
**شماره** دارد به‌علاوهٔ عنوانِ مرحلهٔ جاری، و کلاً `aria-hidden` است —
خواندنش با صفحه‌خوان از راه همان پیام زنده انجام می‌شود.

**کم‌حرکتی**: `reduced` یک بار خوانده می‌شود و بعد به تغییرش گوش داده
می‌شود (کاربر می‌تواند وسط کار در سیستم‌عامل عوضش کند). با آن روشن،
`start()` یک‌راست به مرحلهٔ ۴ می‌پرد.

## `BeanPicker.jsx` — فهرست افزودن دانه

یک `<select>` کوچک که **هر دو حالت** از آن استفاده می‌کنند، تا قاعدهٔ
«چه دانه‌ای می‌شود اضافه کرد» یک جا بماند.

```jsx
<option key={b.slug} value={b.slug} disabled={out}>
  {b.name} — {b.origin}{out ? ' (ناموجود)' : ''}
</option>
```

دانهٔ ناموجود از فهرست **حذف نمی‌شود، خاموش می‌شود**: نبودنش این حس را
می‌داد که دیگر این قهوه را نداریم، در حالی‌که فقط موقتاً تمام شده.
`option` با صفت `disabled` هم با صفحه‌کلید رد می‌شود و هم صفحه‌خوان
«در دسترس نیست» را می‌خواند.

تشخیص ناموجودی از `isSoldOut` در `groups.js` می‌آید:

```js
export const isSoldOut = (item) => isTracked(item) && item.stock < minBuyable(item);
```

یعنی «موجودی شمرده می‌شود **و** از کمینهٔ قابل‌خرید کمتر است» — ۵۰ گرم
باقی‌مانده از قهوه‌ای که کمینه‌اش ۱۰۰ گرم است، عملاً ناموجود است.

## `CardArt.jsx`

پل بین `art.js` و DOM:

```jsx
export function artSVG(item) {
  if (!item) return '';
  try {
    if (item.kind === 'gear') return gearArt(item);
    if (item.kind === 'powder') return powderArt(item);
    return productArt(item);
  } catch {
    return '';   // طرح ناقص نباید کل صفحه را از کار بیندازد
  }
}
```

و انتخاب بین سه راه — که با نیمهٔ دوم مورد ۲۴ از دو راه به سه رسید:

```jsx
if (item?.image) {
  const box = SLOTS[slot] || SLOTS.card;

  /* عکس برداری یا آدرس بیرونی: خام، همان‌طور که بود. */
  if (!isOptimizable(item.image)) {
    return <img className={className} src={item.image} alt={item.name} loading="lazy" />;
  }

  return (
    <Image className={className} src={item.image} alt={item.name}
           width={box.w} height={box.h} sizes={box.sizes} priority={priority} />
  );
}

return <span className="art-holder" dangerouslySetInnerHTML={{ __html: svg }} />;
```

**چرا `next/image`.** عکس آپلودی تا چهار مگابایت خام سرو می‌شد، در قابی
که بزرگ‌ترینش ۳۸۵ پیکسل عرض دارد و کوچک‌ترینش ۷۰. یعنی مشتری موبایل
عکسی را می‌گرفت که هیچ‌وقت بیش از یک بیستمش را نمی‌دید. حالا همان فایل
از `/_next/image` رد می‌شود: به اندازهٔ همان قاب کوچک می‌شود، به AVIF یا
WebP تبدیل می‌شود اگر مرورگر بگوید می‌فهمد، و روی دیسک کش می‌شود.
عددهای اندازه‌گیری‌شده در مورد ۲۴ فصل ۱۱ آمده.

**چرا شرطِ `isOptimizable`.** طرح تولیدی SVG و آدرس بیرونی هر دو از
بهینه‌ساز پاسخ ۴۰۰ می‌گیرند — یعنی **قابِ خالی**، نه عکسِ بهینه‌نشده.
قاعده‌اش در `lib/img.js` است تا با بخش «دربارهٔ ما» یکی بماند.

### جدول `SLOTS` — چرا `sizes` را جایگاه تعیین می‌کند نه کلاس

یک کلاس (`.card-art`) در پنج قاب با پنج اندازهٔ خیلی متفاوت استفاده
می‌شود، پس خودِ کلاس نمی‌تواند به مرورگر بگوید کدام نسخه را بردارد.
فراخوان جایگاهش را نام می‌برد و اندازه‌ها از اینجا می‌آیند:

```js
const SLOTS = {
  card:  { w: 385, h: 152,
           sizes: '(min-width: 1305px) 385px, (min-width: 975px) 30vw, '
                + '(min-width: 645px) 45vw, 92vw' },
  sheet: { w: 120, h: 96, sizes: '120px' },   // سرصفحهٔ صفحهٔ کالا و مودالش
  blend: { w: 78,  h: 64, sizes: '78px' },    // کارت میکس
  thumb: { w: 70,  h: 52, sizes: '70px' }     // بندانگشتیِ سبد و فهرست پنل
};
```

آن چهار پلهٔ `card` از خودِ چیدمان `style.css` درآمده‌اند، نه از حدس.
شبکه‌اش `auto-fill` با ستون کمینهٔ ۲۸۵px و شکاف ۲۲px است، داخل `.wrap`
که `min(1200px, 92%)` عرض دارد — یعنی تعداد ستون‌ها پله‌ای عوض می‌شود و
عرض کارت با عرض پنجره خطی بالا نمی‌رود:

| عرض پنجره | چیدمان | عرض کارت |
|---|---|---|
| ≥ ۱۳۰۵px | سه ستون | ۳۸۵px ثابت |
| ۹۷۵–۱۳۰۵ | سه ستون | حدود ۳۰vw |
| ۶۴۵–۹۷۵ | دو ستون | حدود ۴۵vw |
| < ۶۴۵ | یک ستون | ۹۲vw |

عددهای درصدی مهم‌اند: Next از **کوچک‌ترینِ** آن‌ها تصمیم می‌گیرد
کوچک‌ترین نسخهٔ `srcset` چقدر باشد. با ۳۰vw، نسخه‌های ۲۵۶ و ۳۸۴ و ۴۴۸
پیکسلی هم ساخته می‌شوند — همان‌هایی که یک کارت واقعاً لازم دارد.

> **نکته**
> `w` و `h` فقط **نسبت ابعاد** را می‌دهند تا مرورگر پیش از رسیدن عکس
> جای درست را نگه دارد؛ اندازهٔ واقعی را همچنان CSS تعیین می‌کند. هر دو
> بُعد داده می‌شوند، وگرنه Next هشدار «یک بُعد عوض شده» می‌دهد.
>
> قاب تازه‌ای که اضافه می‌کنید یا باید یکی از این چهار جایگاه را بگیرد
> یا ردیف خودش را در `SLOTS` — وگرنه بی‌صدا `sizes` کارت را می‌گیرد.

`priority` فقط جایی داده می‌شود که تصویر بالای صفحه است (سرصفحهٔ کالا و
مودالش)؛ پیش‌فرضِ `next/image` خودش `lazy` است.

در `admin.css` کلاس `art-holder` با `display: contents` تعریف شده تا این
`<span>` اضافی چیدمان را به‌هم نزند:

```css
/* پوستهٔ نامرئی دور تصویرِ تولیدی، تا چیدمان کارت عوض نشود */
.art-holder{ display:contents; }
```

## `ContentSections.jsx`

پنج بخش که همه یک الگوی مشترک دارند:

```js
const c = content?.whyUs;
if (!c || !Array.isArray(c.reasons) || c.reasons.length === 0) return null;
```

**اگر محتوا نبود، بخش اصلاً رندر نمی‌شود** — نه یک قاب خالی.

`SuggestSection` منطق جالبی دارد:

```js
const chosen = (current.picks || []).map((s) => bySlug.get(s)).filter(Boolean);
if (chosen.length >= 3) return chosen.slice(0, 6);

const seen = new Set(chosen.map((i) => i.slug));
const extra = (byKind.coffee || [])
  .filter((i) => !seen.has(i.slug) && (i.tastes || []).includes(current.key))
  .sort((a, b) => a.rank - b.rank);

return [...chosen, ...extra].slice(0, 6);
```

اول انتخاب دستی مدیر، و اگر کمتر از سه تا بود، از روی برچسب `tastes`
خودِ قهوه‌ها پر می‌شود. کامنت: «این‌طوری با اضافه شدن قهوهٔ تازه،
پیشنهادها هم زنده می‌مانند.»

`PicksSections` مستقیماً API را صدا می‌زند و به `items` وابسته است:

```js
useEffect(() => { ... }, [items]);
```

با کامنت: «وگرنه کالایی که مدیر همین حالا پنهانش کرده تا بارگذاری بعدی
صفحه اینجا می‌ماند.»

## `StaticSections.jsx`

هفت کامپوننت ثابت. دو تای‌شان با صفحه تعامل می‌کنند:

```js
// BrewSection
const pick = (card) => {
  setGrind(card.grind);
  toast(`آسیاب پیش‌فرض روی «${grindLabel(card.grind)}» تنظیم شد`);
  setCoffeeFilter(card.filter);
  setGearFilter(card.gear);
  document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
};
```

یک کلیک، چهار کار: آسیاب پیش‌فرض، پیام، دو فیلتر و پیمایش.

`Footer` یک فرم خبرنامهٔ **صرفاً نمایشی** دارد که فقط پیام محلی نشان
می‌دهد و هیچ درخواستی نمی‌فرستد — برخلاف `ClubSection` که واقعاً ثبت
می‌کند.

## `web/src/components/Track.jsx` — پیگیری سفارش

**۳۴۳ خط.** تنها صفحهٔ عمومیِ دوم سایت. مشتری حساب کاربری ندارد و بعد از
بستن رسید هیچ راهی نداشت بفهمد سفارشش کجاست؛ اینجا با همان دو چیزی که
دستش هست — شمارهٔ سفارش و شمارهٔ موبایلی که داده — وضعیت و محتوای سفارش
را می‌بیند.

**کد از آدرس پیش‌پر می‌شود.** رسید در `Receipt.jsx` لینک می‌دهد:

```jsx
<Link href={`/track?code=${encodeURIComponent(order.code)}`}>وضعیت سفارش را ببینید</Link>
```

و صفحه آن را برمی‌دارد، پس مشتری فقط شماره‌اش را می‌نویسد:

```js
const [code, setCode] = useState(params.get('code') || '');
```

**اعتبارسنجی روی همان چیزی که فرستاده می‌شود:**

```js
const c = toLatinDigits(code).trim();
const p = toLatinDigits(phone).trim();

if (!c) return setError('شمارهٔ سفارش را وارد کنید — روی رسید نوشته شده است');
if (!/^0\d{10}$/.test(p.replace(/[\s-]/g, ''))) {
  return setError('شمارهٔ موبایل را کامل و با ۰ اول وارد کنید، مثل ۰۹۱۲۱۲۳۴۵۶۷');
}
```

سرور هم همین نرمال‌سازی را دارد (`normalizePhone`)، ولی بررسی این طرف
باید روی **رشتهٔ نهایی** باشد نه روی چیزی که کاربر دیده — وگرنه پیام خطا
دربارهٔ متنی می‌بود که اصلاً فرستاده نشده.

**صفحه بین دو نوع شکست فرق نمی‌گذارد.** سرور برای «کد وجود ندارد» و
«شماره جور نیست» یک پاسخ می‌دهد، و این صفحه هم همان پیام را همان‌طور
نشان می‌دهد — هیچ منطق اضافه‌ای که تفاوت را بازسازی کند اینجا نیست:

```js
catch (err) { setError(err.message); }
```

**نوار وضعیت.** سه گام معمول (`new` → `processing` → `done`) به‌صورت یک
`<ol>` با `aria-current="step"` روی گام جاری. «لغو شده» گام نیست، پس
جداگانه و با `role="status"` نشان داده می‌شود:

```jsx
if (status === 'canceled') {
  return <p className="track-canceled" role="status">
    این سفارش لغو شده است. اگر فکر می‌کنید اشتباهی رخ داده، با ما تماس بگیرید.
  </p>;
}
```

کلیدهای `STEPS` همان `enum` مدل `Order` اند و برچسب‌ها از `ORDER_STATUS`
در `groups.js` می‌آیند — همان جدولی که پنل مدیریت هم از آن می‌خواند.

**آنچه این صفحه نشان نمی‌دهد:** نشانی، شمارهٔ تماس و یادداشت مشتری.
این تصمیم سمت **سرور** گرفته شده (`publicOrderView`)، نه اینجا — یعنی
حتی اگر کسی مستقیماً API را صدا بزند هم چیزی بیشتر نمی‌بیند.

### چاپ، بدون اینکه صفحه دو رسیدِ متفاوت پیدا کند

مشتری‌ای که رسیدش را بسته، هیچ راه دیگری برای گرفتن یک نسخهٔ کاغذی
نداشت. دکمهٔ چاپ اینجا همان برگه‌ای را می‌دهد که کشوی سبد می‌داد — همان
کامپوننت `Receipt` و همان سبکِ چاپ:

```jsx
<div className="track-actions">
  <button className="btn btn-ghost" type="button" onClick={() => window.print()}>
    <svg viewBox="0 0 24 24" aria-hidden="true">…</svg>
    چاپ یا ذخیرهٔ رسید
  </button>
</div>

<PrintSheet>
  <Receipt
    order={order}
    shop={shop}
    heading="رسید سفارش"
    showMark={false}
    statusLabel={ORDER_STATUS[order.status] || order.status}
    showTracking={false}
  />
</PrintSheet>
```

چهار پارامتر همان چهار تفاوتِ جدولِ `Receipt.jsx` اند: عنوان به «رسید
سفارش» عوض می‌شود، تیکِ سبزِ «ثبت شد» برداشته می‌شود (این سفارش ممکن است
لغو شده باشد)، وضعیت اضافه می‌شود، و لینکِ «وضعیت سفارش را ببینید»
می‌رود — مشتری همین حالا رویش ایستاده.

**آنچه روی صفحه دیده می‌شود دست نخورده است.** نوار مرحله و بلوکِ وضعیت
مالِ صفحه‌اند و در `PrintSheet` نیستند؛ برگهٔ چاپی جای خودش را دارد.

**و یک درخواست دوم که شکست خوردنش مهم نیست:**

```js
const [found, texts] = await Promise.all([
  api.trackOrder(c, p),
  api.content().catch(() => null)
]);
setOrder(found);
setShop(texts?.about || null);
```

`content()` فقط برای بلوکِ تماسِ برگهٔ چاپی لازم است — تلفن و نشانی و
ساعت کار فروشگاه. `catch(() => null)` عمدی است: نیامدنش نباید پیگیری را
زمین بزند، همان قاعده‌ای که `ShopContext` هم دربارهٔ متن‌ها دارد.

---

# بخش د — وب: پنل مدیریت

<!--DIAGRAM:admin-->

## `AdminShell.jsx`
نوار بالا با شش لینک، دروازهٔ نشست، و `children`. در نسخهٔ ویت نامش
`AdminLayout` بود و `<Outlet />` رندر می‌کرد؛ حالا
`app/admin/(panel)/layout.jsx` فقط یک خط است که همین را دوباره صادر
می‌کند.

سه چیز در جابه‌جایی عوض شد:

**۱) دروازه در افکت است، نه در رندر.** App Router کامپوننتی مثل
`<Navigate>` ندارد و هدایت نباید حین رندر انجام شود:

```jsx
useEffect(() => {
  if (!checking && !admin) router.replace('/admin/login');
}, [checking, admin, router]);

if (checking || !admin) return <div className="admin-boot">در حال بررسی نشست…</div>;
```

تا رفتنِ کاربر همان پیام «بررسی نشست» دیده می‌شود — نه پنلی که یک لحظه
برق بزند و بعد برود.

**۲) لینک فعال با `usePathname` سنجیده می‌شود.** `NavLink` در
react-router خودش می‌دانست کدام مسیر فعال است. اینجا `startsWith` لازم
است، چون فرم کالا (`/admin/items/new` و `/admin/items/:id`) زیرمسیرِ
«کالاها» است و باید همان دکمه را فعال نشان بدهد.

**۳) `ShopProvider` فقط دور محتوا می‌پیچد، نه دور نوار بالا** — و با
پرچم `loadOnMount`، چون صفحه‌های پنل سروری نیستند که کسی فهرست کالاها را
برایشان آماده کند. نوار بالا به فهرست کالاها کاری ندارد.

## `AdminLogin.jsx`
فرم ساده. نکتهٔ خوب: `dir="ltr"` روی هر دو input و
`autoComplete="username"` / `"current-password"` برای password manager.

## `AdminItems.jsx`
فهرست با فیلتر نوع (سرور) + فیلتر دسته (کلاینت) + جست‌وجو (سرور، ۲۵۰ms)
+ هفت گزینهٔ مرتب‌سازی (کلاینت).

کامنت توضیح می‌دهد چرا تقسیم شده: «فیلتر دسته و ترتیب نمایش — هر دو سمت
مرورگر انجام می‌شوند؛ فهرست کالاها کوچک است و رفت‌وبرگشت لازم ندارد.»

هر عملیات مخرب تأیید دومرحله‌ای دارد:

```jsx
{confirmId === item._id ? (
  <span className="confirm">
    <button className="admin-btn danger" onClick={() => remove(item)}>حذف قطعی</button>
    <button className="admin-btn" onClick={() => setConfirmId(null)}>انصراف</button>
  </span>
) : (
  <button className="admin-btn danger" onClick={() => setConfirmId(item._id)}>حذف</button>
)}
```

بدون `window.confirm` — تأیید درون‌خطی و قابل استایل‌دهی.

ستون «موجودی» هم در همین جدول است و سه حالت را به زبان مدیر می‌گوید —
`stockText(item)` یا «نامحدود» می‌دهد یا «۷۵۰ گرم» یا «۳ عدد»، و ردیف
ناموجود کلاس هشدار می‌گیرد.

## `AdminItemForm.jsx` — ۹۶۹ خط

شش `fieldset`: نوع و دسته · معرفی کالا · معرفی کامل · میکس (فقط قهوه) ·
ویترین · قیمت و ترتیب (شامل موجودی) · تصویر کارت.

**کادر موجودی، سه‌حالته.** برچسبش با نوع کالا عوض می‌شود
(«موجودی انبار (گرم)» یا «(عدد)») و **خالی بودن معنا دارد**:

```js
/* موجودی: کادر خالی یعنی نامحدود (null)، نه صفر */
const stockRaw = toLatinDigits(form.stock).trim();
const stock = stockRaw === '' ? null : Math.round(Number(stockRaw));
if (stock !== null && (!Number.isFinite(stock) || stock < 0)) {
  return setError('موجودی باید عددی مثبت باشد، یا خالی بماند برای نامحدود');
}
```

`toLatinDigits` لازم است چون مدیر ممکن است با کیبورد فارسی «۷۵۰» بنویسد.

راهنمای زیر کادر برای میکس‌ها متن دیگری می‌گوید: «برای میکس‌ها معمولاً
خالی درست‌تر است: میکس از همان دانه‌ها ساخته می‌شود و موجودی جدایی
ندارد» — همان دام شناخته‌شده‌ای که در فصل ۱۱ هم آمده است.

**ویژگی برجسته: پیش‌نمایش زنده.** یک شیء موقتی ساخته می‌شود و به همان
`ItemCard` واقعی سایت داده می‌شود:

```js
const preview = useMemo(() => ({
  _id: 'preview',
  kind: form.kind,
  slug: form.slug || 'preview',
  name: form.name || 'نام کالا',
  price: Number(toLatinDigits(form.price)) || 0,
  notes: String(form.notes).split('\n').map((s) => s.trim()).filter(Boolean),
  ...
  grindable: form.kind === 'coffee',
  isBlend: form.kind === 'coffee' && form.isBlend,
}), [form, meta]);
```

با کامنت: «تا پیش‌نمایش دقیقاً مثل سایت رفتار کند.» چون کامپوننت یکی
است، هیچ‌وقت پیش‌نمایش با واقعیت فرق نمی‌کند.

**فهرست دانه‌ها از مسیر مدیریتی خوانده می‌شود:**

```js
api.adminItems({ kind: 'coffee' })
  .then((list) => setBeans((Array.isArray(list) ? list : []).filter((b) => !b.isBlend)))
```

کامنت: «از مسیر مدیریتی خوانده می‌شود تا قهوه‌های خاموش هم دیده شوند —
مدیر ممکن است دانه‌ای را موقتاً از سایت برداشته باشد ولی هنوز در میکس
داشته باشد.» و در `<option>` هم علامت می‌خورد:
`{b.name}{b.active ? '' : ' (خاموش)'}`.

**دستهٔ پیش‌فرض هنگام تغییر نوع:**

```js
useEffect(() => {
  const meta = KINDS[form.kind];
  if (!meta.groups[form.group]) {
    setForm((f) => ({ ...f, group: meta.order[0],
      shape: f.kind === 'gear' ? 'dripper' : f.kind === 'powder' ? 'scoop' : '' }));
  }
}, [form.kind]);
```

جلوگیری از حالت نامعتبر: اگر کاربر از «قهوه/light» به «ابزار» برود،
`light` دستهٔ معتبری برای ابزار نیست.

## `AdminOrders.jsx` و `OrderDetail.jsx`

`AdminOrders` فهرست آکاردئونی با چیپ‌های وضعیت. `OrderDetail` قطعهٔ
مشترکی است که **هم اینجا و هم در مودال گزارش‌ها** استفاده می‌شود —
کامنت بالایش می‌گوید چرا:

> هم صفحهٔ «سفارش‌ها» و هم پنجرهٔ «گزارش‌ها» از همین یک قطعه استفاده
> می‌کنند تا هیچ‌وقت یکی‌شان اطلاعاتی را نشان ندهد که آن یکی نمی‌دهد.

`MixBreakdown` وزن هر دانه را برای کارگاه محاسبه می‌کند:

```jsx
{grams ? <small className="mix-grams">{formatWeight(Math.round((grams * m.percent) / 100))}</small> : null}
```

کامنت: «کارگاه باید بداند دقیقاً از هر دانه چند گرم بریزد.»

## `AdminReports.jsx` — ۵۹۹ خط

چهار بخش: کارت‌های KPI · جدول بازه‌ها با میلهٔ سهم · فهرست سفارش‌ها ·
جعبهٔ خروجی.

**نمودار میله‌ای بدون کتابخانه:**

```jsx
const maxRevenue = Math.max(1, ...buckets.map((b) => b.revenue));
...
<span className="bar" aria-hidden="true">
  <i style={{ inlineSize: `${Math.round((b.revenue / maxRevenue) * 100)}%` }} />
</span>
```

`Math.max(1, ...)` تقسیم بر صفر را می‌بندد. `inlineSize` به‌جای `width`
یعنی در RTL هم از راست پر می‌شود.

**دسترس‌پذیری ردیف‌های کلیک‌پذیر:**

```jsx
<tr tabIndex={0} role="button" aria-pressed={active}
    onClick={...}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ... } }}>
```

**بازخوانی نسخهٔ تازه هنگام باز کردن سفارش:**

```js
const openOrder = async (order) => {
  setOpen(order);                       // فوری، از فهرست
  try {
    const fresh = await api.order(order._id);
    setOpen((cur) => (cur && cur._id === fresh._id ? fresh : cur));
  } catch { /* همان نسخهٔ فهرست را نشان می‌دهیم */ }
};
```

الگوی stale-while-revalidate: فوراً چیزی نشان بده، بعد به‌روزش کن. شرط
`cur._id === fresh._id` از race condition جلوگیری می‌کند (اگر کاربر
سریع سفارش دیگری باز کند).

## `AdminContent.jsx` + `contentSchema.js`

فرم **از روی توصیف داده ساخته می‌شود**. `contentSchema.js` شش نوع فیلد
تعریف می‌کند: `text`, `textarea`, `check`, `select`, `lines`, `list`.

کامپوننت `Field` هر نوع را رندر می‌کند و `ListField` فهرست موردهای
چندفیلدی را با دکمه‌های افزودن/حذف/بالا/پایین:

```js
const move = (i, dir) => {
  const j = i + dir;
  if (j < 0 || j >= rows.length) return;
  const next = [...rows];
  [next[i], next[j]] = [next[j], next[i]];
  onChange(next);
};
```

کامنت: «ترتیب همان‌طور که اینجاست در سایت دیده می‌شود.»

هر بخش دکمهٔ ذخیرهٔ **مستقل** دارد: «هر بخش جدا ذخیره می‌شود تا اگر وسط
کار پشیمان شدید، بقیه دست‌نخورده بمانند.»

فایدهٔ معماری این طراحی: اضافه کردن یک فیلد تازه به سایت فقط دو فایل
عوض می‌کند — `default-content.js` (سرور) و `contentSchema.js` (کلاینت) —
و فرم پنل خودکار به‌روز می‌شود.

## `AdminClub.jsx` و `AdminSettings.jsx`

`AdminClub`: جدول اعضا با جست‌وجوی ۲۰۰ms، حذف با تأیید، دکمهٔ CSV.

`AdminSettings`: تغییر نام کاربری و رمز با اعتبارسنجی سمت کلاینت،
چک‌باکس «نمایش رمزها»، و پیام روشن دربارهٔ اثر تغییر:

> بعد از تغییر رمز، دستگاه‌های دیگری که با رمز قبلی وارد شده‌اند از پنل
> بیرون می‌آیند. همین مرورگر باز می‌ماند.

که دقیقاً همان رفتار `tokenVersion` را به زبان کاربر توضیح می‌دهد.

---

# بخش ه — تست‌ها و پیکربندی

## `vitest.config.mjs`

```js
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{js,jsx}'],
    env: { TZ: 'Asia/Tehran' }
  }
});
```

`environment: 'node'` پیش‌فرض است چون تقریباً هیچ تستی به DOM نیاز ندارد
— حتی `blend-visual.test.js` که ظاهراً دربارهٔ انیمیشن است، فقط عددهای
خالصِ `blendVisual.js` را می‌سنجد.

سه استثنا هست و هر سه عمدی‌اند: `item-card.test.jsx`،
`cart-hydration.test.jsx` و `item-detail.test.jsx` با کامنت
`// @vitest-environment jsdom` بالای خودشان محیط را عوض می‌کنند —
**همان‌جا، نه اینجا**، تا بقیهٔ فایل‌ها بی‌جهت داخل jsdom اجرا نشوند.
JSX هم پیکربندی نمی‌خواهد: ترنسفورمر ویت‌تست ۴ خودش ران‌تایم خودکار را
می‌گیرد.

`share.test.js` و `toast-store.test.js` عمداً در این فهرست **نیستند**،
با اینکه هر دو دربارهٔ رفتار مرورگرند. `share.js` وابستگی‌هایش را
پارامتر می‌گیرد و `toastStore.js` یک انبارهٔ ساده است، پس هر دو در محیط
`node` اجرا می‌شوند — همان قاعدهٔ ۹.

`TZ` ثابت شده چون گزارش‌ها روی وقت تهران بسته می‌شوند؛ بدون آن،
`jalali.test.js` روی ماشین CI (که UTC است) نتیجهٔ دیگری می‌داد.

> **نکته**
> در دوران مهاجرت این پیکربندی دو «پروژه» داشت: `client` روی ری‌اکت ۱۸ و
> `web` روی ۱۹. تستی که کامپوننت رندر می‌کند باید رندرکننده و کامپوننت را
> از یک نسخه بگیرد، پس یک پروژهٔ جدا با `alias` لازم بود. با برداشته شدن
> `client` آن تقسیم هم برداشته شد.

## `tests/*.test.{js,jsx}` — بیست‌ودو فایل، ۳۸۰ سنجه

هیچ‌کدام به پایگاه داده دست نمی‌زنند. جایی که کد واقعاً به مونگو نیاز
دارد، مدل **تزریق** می‌شود و تست یک بدل چند خطی می‌سازد:

```js
// tests/stock.test.js — بدلِ مدل Item
async findOneAndUpdate(filter, update) {
  const row = rows.find((r) => r.slug === filter.slug);
  if (!row) return null;
  /* شرط $gte عمداً با null جور نمی‌شود — همان رفتار مونگو */
  const need = filter.stock.$gte;
  if (typeof row.stock !== 'number' || row.stock < need) return null;
  row.stock += update.$inc.stock;
  return { slug: row.slug, stock: row.stock };
}
```

بدل عمداً همان **ضمانتِ مهم** مونگو را تقلید می‌کند و نه بیشتر: شرط و
کاهش یکجا. کامنت خودِ فایل می‌گوید چرا این کافی است — جاوااسکریپت تک‌نخی
است، پس هر عملیات هم‌زمان‌ناپذیر است، دقیقاً مثل تکِ سند مونگو که در
لحظهٔ به‌روزرسانی قفل است.

حتی جزئیاتی مثل شکل بازگشتی هم رعایت شده: `findOne` عمداً `async` نیست،
چون کد واقعی `findOne(...).lean()` می‌نویسد و باید شیئی با متد `lean`
بگیرد، نه یک Promise.

چند نمونه از چیزهایی که این تست‌ها **واقعاً** نگه می‌دارند:

| فایل | یک ادعای نمونه |
|---|---|
| `pricing.test.js` | «مرز ۳۰۰۰ گرم: ۲۹۹۹ هنوز ۵٪ است، ۳۰۰۰ می‌شود ۱۰٪» |
| `blend.test.js` | «هزار حرکت تصادفی هم مجموع را خراب نمی‌کند» |
| `blend-visual.test.js` | «دهانهٔ هر کیسه — کوچک یا بزرگ — دقیقاً سر قیف می‌ایستد» |
| `card-art.test.js` | «نام نمی‌تواند تگ را ببندد و `<script>` باز کند» |
| `stock.test.js` | «شکست ردیف سوم، دو ردیف اول را پس می‌دهد» |
| `track.test.js` | «کد درست با شمارهٔ غلط، دقیقاً همان پاسخ کد ناموجود را می‌دهد» |
| `upload.test.js` | «تصویر عادی دانلود اجباری نمی‌شود — وگرنه کارت‌ها می‌شکستند» |
| `taxonomy.test.js` | «همان آرایه است، نه آرایه‌ای شبیه آن» |
| `item-routes.test.js` | «`itemPath` هیچ‌وقت با / تمام نمی‌شود» |
| `next-routes.test.js` | «هر `segment` در `KIND_SEGMENTS` یک پوشهٔ مسیر دارد، و هر پوشه یک `segment`» |
| `next-metadata.test.js` | «هر تگی که `headTags` می‌سازد در شیء metadata پیدا می‌شود» |
| `json-ld.test.js` | «نام کالایی مثل `</script>` از `<script>` بیرون نمی‌زند» |
| `sitemap.test.js` | «کالای خاموش در نقشهٔ سایت نمی‌آید» |
| `cart-storage.test.js` | «شناسهٔ ردیف از نو ساخته می‌شود، نه از حافظه خوانده» |
| `share.test.js` | «کرومِ ویندوز `navigator.share` دارد، ولی آنجا هم باید کپی شود» |
| `toast-store.test.js` | «`getServerToast` حتی وقتی پیامی روی میز باشد خالی است» |
| `cart-hydration.test.jsx` | «سبدِ ذخیره‌شده بعد از hydrate هنوز سر جایش است» |
| `item-card.test.jsx` | «کارت هر نوع کالا `<a href>` واقعی دارد» |
| `item-detail.test.jsx` | «مودال بدون `ShopProvider` رندر می‌شود» |

سه فایل از این‌ها با مورد ۲۶ اضافه شدند و هدفشان یک چیز است: نگه داشتن
چیزی که **دیده نمی‌شود**. یک لینک شکسته را آدم می‌بیند؛ سبدی که بی‌صدا
پاک شود را نه.

سه فایلِ تازه‌تر هم دقیقاً همان منطق را دنبال می‌کنند:

- **`share.test.js`** یک دامِ مشخص را می‌بندد. یک روز شرطِ دوراهیِ
  هم‌رسانی فقط `typeof nav.share === 'function'` بود، با این فرض که
  «تقریباً هیچ مرورگر دسکتاپی share ندارد». کرومِ ویندوز آن را دارد،
  ولی برگه‌ای که باز می‌کند بی‌کار بسته می‌شود و در آن مسیر هیچ‌وقت
  کاری به کلیپ‌بورد نمی‌رسید — یعنی کاربر دسکتاپ دکمه را می‌زد، پنلی
  می‌آمد و می‌رفت، و لینک هیچ‌جا کپی نشده بود. چهار تستِ بخشِ «دسکتاپی
  که `navigator.share` دارد» تنها چیزی‌اند که جلوی برگشتنِ آن رفتار را
  می‌گیرند.
- **`toast-store.test.js`** دو خرابیِ نادیدنی را می‌گیرد: پیامی که پاک
  نشود و تا ابد بماند، و پیام دومی که شمارشِ اولی را به ارث ببرد.
- **`item-detail.test.jsx`** سومین استثنای قاعدهٔ ۹ است و دامنه‌اش یک
  چیز بیشتر نیست: مودال باید بدون هیچ Provider ای رندر شود. اگر روزی
  `ShareButton` دوباره سراغ `useShop` برود، همه‌چیز در صفحهٔ اصلی و
  صفحهٔ کالا سبز می‌ماند و فقط **مودال** می‌ترکد — یعنی راهی که بیشترِ
  بازدیدکننده‌ها کالا را از آن می‌بینند.

`card-art.test.js` یک ویژگی کمیاب دارد: **خودِ سنجه را هم می‌سنجد.** یک
تست عمداً رشتهٔ escape‌نشده می‌سازد و انتظار دارد سنجه شکست را ببیند —
تا اگر روزی regexِ بررسی خراب شد، بقیهٔ تست‌ها بی‌صدا سبز نمانند.

`taxonomy.test.js` هم به `toBe` تکیه می‌کند نه `toEqual`: ترتیب‌های UI
باید **همان آرایهٔ shared** باشند، نه کپیِ برابرِ آن. یک کپی امروز برابر
است و فردا واگرا می‌شود.

## `eslint.config.mjs` و `.prettierrc`

flat config با سه ناحیه: کد Node در `server/` و `shared/`، کد مرورگر در
`web/` (با `eslint-plugin-react` و `react-hooks`)، و تست‌ها.
`eslint-config-prettier` آخر صف می‌نشیند تا قاعده‌های سلیقه‌ایِ
قالب‌بندی با Prettier دعوا نکنند.

در `.prettierignore` پنج دستهٔ کنارگذاشته وجود دارد و هر پنج کامنت دارند:
نسخهٔ ایستای ریشه (که امروز فقط `img/` از آن مانده — مورد ۱۸)، دو فایل
seed (هر ردیف عمداً یک خط بلند است)، خروجی ساخته‌شدهٔ
`docs/documentation.html`، چهار فایل ستون‌ترازِ `scripts/docs/`، و همهٔ
`*.md` — چون تنها کار Prettier با متن فارسی هم‌تراز کردن ستون‌های جدول
است و با پهنای حروف فارسی نتیجه به‌هم‌ریخته‌تر می‌شود.

جاهایی که ستون‌بندی دستی معنا دارد ولی فایل در ignore نیست، با
`// prettier-ignore` علامت خورده‌اند: جدول `TIERS`، جدول‌های
`shared/taxonomy.js`، `WRITABLE` در روتر کالا، و schema های ستون‌تراز
در مدل‌ها.
