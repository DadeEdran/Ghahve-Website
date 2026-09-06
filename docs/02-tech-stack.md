# ۲. پشتهٔ فناوری و دلیل انتخاب هر ابزار

## ۲.۱ فهرست کامل وابستگی‌ها

پروژه سه `package.json` دارد. ریشه فقط هماهنگ‌کننده است و هیچ وابستگی
تولیدی ندارد.

### ریشه — `package.json`

```json
{
  "name": "ghahve",
  "private": true,
  "workspaces": ["shared", "server", "web"],
  "scripts": {
    "setup": "npm install && npm run seed",
    "dev": "concurrently -n \"api,web\" -c \"yellow,magenta\" \"npm:dev:server\" \"npm:dev:web\"",
    "dev:server": "npm run dev -w server",
    "dev:web": "npm run dev -w ghahve-web",
    "build": "npm run build -w ghahve-web",
    "start": "concurrently -n \"api,web\" -c \"yellow,magenta\" \"npm:start:server\" \"npm:start:web\"",
    "test": "vitest run",
    "docs:pdf": "npm run docs:build && npm run docs:check && npm run docs:render"
  }
}
```

سه چیز در همین چند خط تغییر کرده و هر سه معنا دارند: `workspaces` جای
`npm --prefix` را گرفت (یک نصب، یک `package-lock.json`)، `dev:client` شد
`dev:web`، و `start` دیگر یک فرآیند نیست — دو تاست، چون Next و Express
جدا اجرا می‌شوند.

وابستگی‌های توسعهٔ ریشه هم فهرست کوتاهی نیست دیگر: `concurrently` برای
اجرای همزمان، `vitest` و `jsdom` برای تست، `eslint` و `prettier` برای
کیفیت کد، و `marked` و `playwright` و `pdfjs-dist` که فقط برای ساختن
همین سند (`npm run docs:pdf`) لازم‌اند.

### سرور — `server/package.json`

| بسته | نسخه | نقش |
|---|---|---|
| `express` | `^4.19.2` | چارچوب HTTP |
| `mongoose` | `^8.6.0` | ODM برای MongoDB |
| `jsonwebtoken` | `^9.0.2` | امضا و بررسی توکن ورود مدیر |
| `bcryptjs` | `^2.4.3` | هش رمز عبور |
| `multer` | `^2.2.0` | آپلود تصویر (multipart/form-data) |
| `compression` | `^1.8.1` | فشرده‌سازی gzip پاسخ‌ها (مورد ۲۴) |
| `helmet` | `^8.3.0` | هدرهای امنیتی پاسخ‌های API (مورد ۷) |
| `express-rate-limit` | `8.6.2` | سه محدودکنندهٔ نرخ (مورد ۱ و ۲) |
| `cors` | `^2.8.5` | اجازهٔ درخواست از مبدأ فرانت |
| `dotenv` | `^16.4.5` | خواندن `server/.env` |
| `@ghahve/shared` | `*` | منطق مشترک با مرورگر (workspace محلی) |

### وب — `web/package.json`

| بسته | نسخه | نقش |
|---|---|---|
| `next` | `^16.3.1` | فریم‌ورک: مسیریابی، رندر سمت سرور، build |
| `react` + `react-dom` | `^19.2.0` | کتابخانهٔ رابط کاربری |
| `@ghahve/shared` | `*` | منطق مشترک با سرور |

**جمعاً ۱۱ وابستگی تولیدی در سرور و ۴ در وب** — و در هر دو فهرست،
`@ghahve/shared` یک بستهٔ محلی است نه چیزی که از رجیستری بیاید. این عدد
کم، خودش یک تصمیم است و در ادامه دلیلش را می‌بینیم.

مسیریابی در این فهرست نیست، و این عمدی است: جدول مسیرها **ساختار
پوشه‌های `web/src/app`** است. `react-router-dom` با مورد ۲۶ حذف شد.

---

## ۲.۲ چرا MERN؟

پروژه یک فروشگاه با ساختار دادهٔ **ناهمگن** است. سه نوع کالا داریم که
بعضی فیلدهایشان مشترک است (نام، قیمت، دسته، تصویر) و بعضی فقط برای یک نوع
معنی دارد:

- `mat` (جنس) فقط برای ابزار
- `tone` (رنگ پودر) فقط برای پودر
- `components` و `surcharge` فقط برای میکس‌های قهوه

در یک پایگاه دادهٔ رابطه‌ای، این یعنی یا جدول‌های جداگانه با join، یا یک
جدول پهن با ستون‌های `NULL` فراوان، یا الگوی EAV. در MongoDB، سند فقط
فیلدهایی را دارد که لازم است. کامنت بالای `itemSchema` در
`server/src/models/Item.js` دقیقاً همین را می‌گوید:

```js
/* ══════════════════════════════════════════════════
   یک مدل واحد برای هر سه نوع کالا: قهوه، ابزار، پودر.
   تفاوت‌ها با فیلد kind مشخص می‌شود. یکی بودن مدل باعث
   می‌شود پنل مدیریت و مسیرهای API هم یکی باشند و جای
   کمتری برای اشتباه بماند.
   ══════════════════════════════════════════════════ */
```

دلیل دوم، **مدل `Content` است**. متن‌های سایت در سندهایی با شکل
`{key: String, data: Mixed}` ذخیره می‌شوند. `Mixed` یعنی «هر شکلی که
خواستی». به همین دلیل، اضافه کردن یک بخش تازه به سایت هیچ **مهاجرت
پایگاه داده‌ای** لازم ندارد. کامنت `server/src/models/Content.js` این را
صریح می‌گوید:

> هر بخش یک کلید دارد و شکل دادهٔ خودش را — تا وقتی بخواهیم بخش تازه‌ای
> اضافه کنیم مجبور به مهاجرت پایگاه داده نشویم.

دلیل سوم، **یک‌زبانه بودن** است. همان `pricing.js` که در مرورگر اجرا
می‌شود، عیناً در سرور هم اجرا می‌شود. اگر بک‌اند PHP یا Python بود، باید
فرمول قیمت‌گذاری دو بار به دو زبان نوشته می‌شد و همگام نگه‌داشتنش سخت‌تر
بود.

**اما هزینه‌اش را هم بشناسید:** MongoDB یکپارچگی ارجاعی ندارد. در این
پروژه، `Item.components[].slug` به یک قهوهٔ دیگر اشاره می‌کند اما هیچ
`FOREIGN KEY`ای وجود ندارد. برای همین در `server/src/routes/items.js`
تابعی به‌نام `checkBlend` نوشته شده که این را **دستی** بررسی می‌کند:

```js
const found = await Item.find({ slug: { $in: slugs }, kind: 'coffee' })
                        .select('slug isBlend').lean();
const bySlug = new Map(found.map((f) => [f.slug, f]));

for (const s of slugs) {
  const bean = bySlug.get(s);
  if (!bean) return `دانهٔ «${s}» پیدا نشد — فقط قهوه‌ها را می‌شود در میکس گذاشت`;
  if (bean.isBlend) return `«${s}» خودش یک میکس است و نمی‌تواند جزء میکس دیگری باشد`;
}
```

این کاری است که در SQL با یک `FOREIGN KEY` و یک `CHECK` رایگان به دست
می‌آمد.

---

## ۲.۳ چرا Mongoose و نه درایور خام؟

Mongoose سه چیز به پروژه اضافه می‌کند که هر سه در کد استفادهٔ جدی دارند:

**۱) اعتبارسنجی با پیام فارسی.** هر فیلد پیام خطای خودش را دارد:

```js
name:  { type: String, required: [true, 'نام کالا الزامی است'], trim: true },
meter: { type: Number, default: 3,
         min: [1, 'کمترین مقدار ۱ است'],
         max: [5, 'بیشترین مقدار ۵ است'] },
```

و در `server/src/index.js`، مبدل خطای سراسری همین پیام‌ها را مستقیم به
کاربر می‌رساند:

```js
if (err.name === 'ValidationError') {
  const first = Object.values(err.errors)[0];
  return res.status(400).json({ error: first?.message || 'اطلاعات وارد شده کامل نیست' });
}
```

یعنی مدیر به‌جای `E11000 duplicate key error collection...` پیام
«این شناسه قبلاً استفاده شده است» می‌بیند.

**۲) قلاب `pre('validate')`.** پیچیده‌ترین منطق مدل `Item` — که در فصل ۷
خط‌به‌خط بررسی می‌شود — در یک قلاب اجرا می‌شود که **هم موقع `create` و هم
موقع `save`** کار می‌کند. این باعث می‌شود قواعدی مثل «فقط قهوه آسیاب
می‌شود» و «مجموع درصدهای میکس باید ۱۰۰ باشد» از هر مسیری که کالا ذخیره
شود اعمال شوند.

توجه کنید که به همین دلیل، مسیر ویرایش عمداً از `findByIdAndUpdate`
استفاده **نمی‌کند**:

```js
// server/src/routes/items.js
const item = await Item.findById(req.params.id);
Object.assign(item, data);
await item.save();          // ← تا pre('validate') اجرا شود
```

`findByIdAndUpdate` قلاب‌های سند را دور می‌زند و این قواعد اجرا نمی‌شدند.

**۳) `virtual` و `toJSON` سفارشی.** فیلد `weighed` در پایگاه داده ذخیره
نمی‌شود، بلکه محاسبه می‌شود:

```js
itemSchema.virtual('weighed').get(function () {
  return IS_WEIGHED[this.kind] === true;
});
```

و `toJSON` در مدل `Admin` باعث می‌شود `passwordHash` هیچ‌وقت — حتی به
اشتباه — در پاسخ API نیاید:

```js
toJSON: {
  transform(_d, ret) { delete ret.passwordHash; delete ret.__v; return ret; }
}
```

این «امنیت در عمق» است: حتی اگر برنامه‌نویس در یک مسیر اشتباهاً کل سند
مدیر را برگرداند، هش رمز بیرون نمی‌رود.

---

## ۲.۴ چرا Express و نه Fastify یا NestJS؟

Express حداقلی است و همین‌جا برازنده است. کل `server/src/index.js` فقط
۹۳ خط است و شامل: تنظیم CORS، محدودیت بدنه، سرو استاتیک، ثبت هفت روتر،
SPA fallback، ۴۰۴ و مبدل خطا.

الگوی معماری، **روتر به ازای هر منبع** است:

```
/api/auth     → routes/auth.js
/api/items    → routes/items.js
/api/orders   → routes/orders.js
/api/content  → routes/content.js
/api/club     → routes/club.js
/api/stats    → routes/stats.js
/api/reports  → routes/reports.js
```

NestJS با decorator، DI container و ماژول‌بندی، برای تیم‌های بزرگ و
پروژه‌های پیچیده ارزش دارد؛ اینجا فقط سربار مفهومی اضافه می‌کرد. Fastify
سریع‌تر است اما این پروژه هیچ‌جا محدود به توان سرور نیست.

نکتهٔ ظریفی که Express اجازه داده، **استریم کردن خروجی** است. در
`server/src/routes/reports.js` فایل CSV به‌جای ساخته شدن در حافظه، تکه‌تکه
نوشته می‌شود:

```js
const cursor = Order.find(filter).sort({ createdAt: -1 }).lean().cursor();
for await (const o of cursor) {
  if (mode === 'lines') { for (const row of lineRows(o)) res.write(csvRow(row)); }
  else { res.write(csvRow(orderRow(o))); }
}
res.end();
```

کامنت بالای این بخش دلیلش را می‌گوید: «فایل‌ها را تکه‌تکه می‌فرستیم تا
حافظهٔ سرور با پشتیبانِ بزرگ پر نشود.»

---

## ۲.۵ چرا JWT و نه session؟

انتخاب JWT در این پروژه سه دلیل عملی دارد:

**یک — سرور بدون حالت (stateless).** هیچ فروشگاه session ای لازم نیست؛
نه Redis، نه جدول `sessions` در MongoDB.

**دو — فقط یک کاربر واقعی دارد.** کل سیستم احراز هویت برای **مدیر** است.
مشتری‌ها اصلاً حساب کاربری ندارند: سفارش با نام و شماره ثبت می‌شود و
عضویت باشگاه هم بدون رمز است (کامنت `ClubMember.js`: «رمز عبوری در کار
نیست»).

**سه — مشکل ابطال با یک ترفند ساده حل شده.** ایراد کلاسیک JWT این است که
نمی‌شود توکن صادرشده را باطل کرد. راه‌حل این پروژه یک عدد در سند مدیر است:

```js
// server/src/models/Admin.js
tokenVersion: { type: Number, default: 0 }

// server/src/middleware/auth.js
export function signToken(admin) {
  return jwt.sign({ sub: String(admin._id), v: admin.tokenVersion },
                  process.env.JWT_SECRET, { expiresIn: `${hours}h` });
}

export async function requireAdmin(req, res, next) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  const admin = await Admin.findById(payload.sub);
  if (admin.tokenVersion !== payload.v) {
    return res.status(401).json({ error: 'رمز عوض شده است، دوباره وارد شوید' });
  }
  ...
}
```

و در `routes/auth.js` هنگام تغییر رمز:

```js
await admin.setPassword(next_);
admin.tokenVersion += 1;   // توکن‌های قدیمی باطل می‌شوند
await admin.save();
```

با یک عدد، همهٔ نشست‌های قدیمی از کار می‌افتند — بدون جدول blacklist.
و بلافاصله توکن تازه برگردانده می‌شود تا خودِ مدیر از پنل بیرون نیفتد.

> **نکته**
> `requireAdmin` در هر درخواست یک `findById` به پایگاه داده می‌زند. یعنی
> این JWT دیگر کاملاً stateless نیست. این معاملهٔ آگاهانه‌ای است: یک کوئری
> ارزان در ازای امکان ابطال فوری.

---

## ۲.۶ چرا bcryptjs و نه bcrypt؟

`bcrypt` (بدون js) یک ماژول native است که هنگام نصب باید کامپایل شود و
روی ویندوز به Visual Studio Build Tools نیاز دارد. `bcryptjs` پیاده‌سازی
خالص جاوااسکریپت است: کندتر، اما بدون هیچ دردسر نصبی.

با توجه به اینکه در کل عمر برنامه شاید چند ده بار عملیات هش انجام شود
(ورود مدیر و تغییر رمز)، این کندی کاملاً بی‌اهمیت است. ضریب کار روی ۱۲
تنظیم شده که استاندارد امروزی است:

```js
adminSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};
```

---

## ۲.۷ چرا React با Context و نه Redux؟

سه دلیل که هر سه از خودِ کد پیداست:

**یک — حجم حالت سراسری کم است.** کل چیزی که در `ShopContext` نگه داشته
می‌شود: فهرست کالاها، متن‌های سایت، سبد خرید، آسیاب پیش‌فرض و یک toast.
همین. بقیهٔ حالت‌ها محلی‌اند: فیلترها در `HomeShell.jsx`، ترتیب و جست‌وجو
در `CatalogSection`، ترکیب میکس در `BlendCard`، مرحلهٔ تسویه در
`CartDrawer`.

با آمدن رندر سمت سرور (مورد ۲۶) نقشِ این Provider هم کمی عوض شد: دیگر
خودش داده نمی‌گیرد. کالاها و متن‌ها روی سرور خوانده و به‌شکل پارامتر
تحویل داده می‌شوند، و Provider فقط نگه‌دارندهٔ حالت است. تنها استثنا پنل
مدیریت است که صفحه‌هایش سروری نیستند و با پرچم `loadOnMount` خودش
می‌خواند.

**دو — الگوی «Context + hook سفارشی» ارزان و خواناست:**

```js
const ShopContext = createContext(null);
export const useShop = () => useContext(ShopContext);
```

هر کامپوننتی که به داده نیاز دارد، `const { cart, addWeighed } = useShop()`
می‌نویسد. Redux یعنی action و reducer و selector و middleware — برای این
اندازه، سربار خالص.

**سه — مشکل rerender با `useMemo` مدیریت شده.** ایراد اصلی Context این
است که هر تغییر مقدار، همهٔ مصرف‌کنندگان را rerender می‌کند. در این پروژه
ساختارهای گران با `useMemo` و توابع با `useCallback` تثبیت شده‌اند:

```js
const bySlug = useMemo(() => new Map(items.map((i) => [i.slug, i])), [items]);
const lookup = useCallback((slug) => bySlug.get(slug), [bySlug]);
const totals = useMemo(() => computeTotals(resolved, lookup), [resolved, lookup]);
```

> **صادقانه:** شیء `value` که به `Provider` داده می‌شود، خودش با `useMemo`
> پوشیده نشده است. یعنی در هر رندر `ShopProvider` یک شیء تازه ساخته می‌شود
> و همهٔ مصرف‌کنندگان rerender می‌شوند. با اندازهٔ فعلی صفحه مشکلی ایجاد
> نمی‌کند، ولی نقطه‌ای است که در فصل ۱۱ به‌عنوان مسیر بهبود ذکر شده است.

---

## ۲.۸ چرا Next.js — و چرا اولش نه

این بخش دو نسخه دارد، چون تصمیمش یک بار عوض شد. متنِ اول عمداً می‌ماند:
استدلالِ رد شدن، بخشی از تاریخِ همین انتخاب است.

### آنچه اول انتخاب شد: Vite

**در برابر CRA:** CRA عملاً بایگانی شده است. Vite در توسعه از ماژول‌های
ES بومی مرورگر استفاده می‌کند، پس سرور در چند صد میلی‌ثانیه بالا می‌آید و
HMR تقریباً آنی است.

**در برابر Next.js — استدلالِ آن روز:** Next رندر سمت سرور می‌دهد که برای
SEO یک فروشگاه واقعی حیاتی است. اما Next با خودش یک مدل مسیریابی مبتنی
بر فایل، مرز server/client component و زنجیرهٔ build سنگین‌تر می‌آورد.
برای پروژه‌ای که هدفش نمایش معماری یک فروشگاه با پنل مدیریت است، Vite
ساده‌تر و شفاف‌تر به‌نظر می‌رسید.

### چه چیزی آن استدلال را برگرداند

سه چیز، و هیچ‌کدام «سلیقه» نبود (شرحِ کامل پای مورد ۲۶ در فصل ۱۱):

۱) راه میانی — تزریق `<head>` داخل `index.html` — کارتِ تلگرام را درست
   کرد ولی **متنِ صفحه** را نه، که همان مسئلهٔ اصلی بود.

۲) نگه‌داشتن آن راه میانی خودش هزینه داشت: `<head>` هر صفحهٔ کالا دو بار
   ساخته می‌شد (یک بار رشته در سرور، یک بار عنصر DOM در مرورگر) و یک
   پشتهٔ سه‌حالته و یک تستِ همگامی لازم داشت تا واگرا نشوند.

۳) «prerender جواب نمی‌دهد» درست بود، ولی راه سومی هم بود که آن روز دیده
   نشد: رندر سمت سرور **در هر درخواست**. نه build تازه برای هر کالا، نه
   فهرستِ موقع ساخت.

### آنچه Next در این پروژه واقعاً می‌کند

**۱) مسیریابی بدون کتابخانه.** پوشه = مسیر. سه پوشهٔ `coffee/[slug]`،
`gear/[slug]` و `powder/[slug]` یک پیاده‌سازی مشترک را صدا می‌زنند، و
`tests/next-routes.test.js` نگه می‌دارد که هیچ نوعی بی‌مسیر نماند.

**۲) `generateMetadata` به‌جای مدیر `head`.** همان توصیفی که
`shared/seo.js` می‌سازد به Next داده می‌شود و Next رندرش می‌کند — یک
رندرکننده، نه دو تا.

**۳) مسیرهای رهگیری‌شده.** مودالِ کالا با `app/@modal` بازسازی شد: کلیک
از داخل سایت مودال را روی همان صفحه باز می‌کند، بازدید سرد صفحهٔ کامل را
می‌دهد. جانشین `state.backgroundLocation` قبلی.

**۴) پراکسی، همان‌طور که ویت می‌کرد.** جای `vite.config.js` را
`next.config.mjs` گرفت:

```js
// web/next.config.mjs
async rewrites() {
  return [
    { source: '/api/:path*',     destination: `${API_URL}/api/:path*` },
    { source: '/uploads/:path*', destination: `${API_URL}/uploads/:path*` },
    { source: '/sitemap.xml',    destination: `${API_URL}/sitemap.xml` },
    { source: '/robots.txt',     destination: `${API_URL}/robots.txt` }
  ];
}
```

نتیجهٔ عملی همان است که با ویت بود: در `web/src/lib/api.js` هیچ‌جا
`http://localhost:4000` نوشته نشده و همه‌جا مسیر نسبی است.

```js
items: () => request('/api/items'),
```

تفاوت این است که حالا یک مصرف‌کنندهٔ دوم هم هست — خودِ سرور. برای همین
`web/src/lib/data.js` جدا وجود دارد: روی سرور `fetch` مبدأ ندارد، پس
آدرس Express از محیط (`API_URL`) می‌آید.

### بهایی که پرداخت شد

- **کشِ ایستا نداریم.** سیاست امنیتی صفحه‌ها با nonce کار می‌کند و nonce
  برای هر درخواست تازه است، پس همهٔ صفحه‌ها پویا رندر می‌شوند.
- **جاوااسکریپت بیشتر:** ۲۲۵ کیلوبایت gzip در برابر ۱۲۹ کیلوبایت باندل
  ویت — ولی دیگر مانع اولین رنگ نیست.
- **دو فرایند به‌جای یک.**

---

## ۲.۹ مسیریابی: از React Router به پوشه‌ها

فروشگاه تقریباً یک صفحه است، اما پنل مدیریت **نه**. پنل هشت مسیر دارد و
سه قابلیت لازم داشت. تا پیش از مورد ۲۶ این سه را `react-router-dom`
می‌داد؛ حالا هر سه از خودِ App Router می‌آیند:

| نیاز | پیش‌تر (react-router) | حالا (App Router) |
|---|---|---|
| layout مشترک | `<Route element={<AdminLayout/>}>` + `<Outlet/>` | `app/admin/(panel)/layout.jsx` + `children` |
| پارامتر مسیر | `useParams()` از react-router | `useParams()` از `next/navigation` |
| محافظت از مسیر | `<Navigate to="/admin/login" replace />` | هدایت در افکت، با `router.replace` |

دو نکتهٔ ریز که در این جابه‌جایی معنا داشتند:

**۱) صفحهٔ ورود بیرون از دروازه است.** در نسخهٔ قبل `/admin/login` یک
مسیر جدا بیرون از `AdminLayout` بود. همان تقسیم با یک **گروه مسیر** حفظ
شد: `app/admin/layout.jsx` نشست را برای همه فراهم می‌کند (صفحهٔ ورود هم
لازمش دارد تا بفهمد از قبل وارد شده‌اید یا نه)، و دروازه یک لایه
پایین‌تر در `(panel)/layout.jsx` است.

**۲) هدایت دیگر در رندر انجام نمی‌شود.** App Router کامپوننتی مثل
`<Navigate>` ندارد و هدایت باید بیرون از رندر باشد:

```jsx
useEffect(() => {
  if (!checking && !admin) router.replace('/admin/login');
}, [checking, admin, router]);

if (checking || !admin) return <div className="admin-boot">در حال بررسی نشست…</div>;
```

تا رفتنِ کاربر، همان پیام «بررسی نشست» دیده می‌شود — نه پنلی که یک لحظه
برق بزند و بعد برود.

---

## ۲.۱۰ چرا multer با تنظیمات سفارشی؟

فایل `server/src/lib/upload.js` سه محافظ دارد:

```js
/* SVG عمداً در این فهرست نیست (مورد ۵ سند ضعف‌ها) */
export const ALLOWED = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp',
  'image/gif': '.gif', 'image/avif': '.avif'
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
  limits: { fileSize: 4 * 1024 * 1024 },   // ۴ مگابایت
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED[file.mimetype]) {
      return cb(new Error('فقط تصویر JPG، PNG، WebP، AVIF یا GIF قابل آپلود است'));
    }
    cb(null, true);
  }
});
```

- **نام تصادفی ۲۴ نویسه‌ای** هم مشکل نام فارسی را حل می‌کند، هم برخورد
  نام‌ها را، و هم مهم‌تر: **حملهٔ path traversal** را می‌بندد. اگر نام
  اصلی فایل حفظ می‌شد، مهاجم می‌توانست `../../server/src/index.js`
  بفرستد.
- **whitelist بر پایهٔ MIME** نه پسوند.
- **سقف ۴ مگابایت** روی حجم.

> **نکته**
> `image/svg+xml` روزی در این فهرست بود و **برداشته شد** (مورد ۵). SVG یک
> سند XML است، نه تصویر خام، و می‌تواند `<script>` داشته باشد؛ چون
> فایل‌ها از `/uploads` روی همان دامنه سرو می‌شوند، آن اسکریپت در مبدأ
> خودِ فروشگاه اجرا می‌شد و به توکن مدیر در `localStorage` هم دسترسی
> داشت.
>
> بستن فهرست به‌تنهایی کافی نبود، چون هرچه پیش‌تر آپلود شده بود هنوز روی
> دیسک است. پس `setUploadHeaders` در همان فایل یک لایهٔ دوم گذاشت:
> `nosniff`، `Content-Security-Policy: default-src 'none'; sandbox`،
> `Cross-Origin-Resource-Policy: same-origin`، و برای پسوندهای سندی
> (`.svg`، `.xml`، `.html`، …) `Content-Disposition: attachment`.
> `tests/upload.test.js` هر دو لایه را می‌سنجد — از جمله اینکه تصویر
> عادی **دانلود اجباری نشود**، وگرنه کارت‌ها می‌شکستند.

---

## ۲.۱۱ ابزارهایی که عمداً استفاده *نشده‌اند*

این فهرست به‌اندازهٔ فهرست وابستگی‌ها گویاست:

| ابزار رایج | جایگزین در این پروژه |
|---|---|
| Redux / Zustand / Jotai | Context API + `useMemo`/`useCallback` |
| Tailwind / Bootstrap / MUI | CSS دست‌نویس با متغیرهای CSS |
| `moment-jalaali` / `date-fns-jalali` | `server/src/lib/jalali.js` (۲۸۳ خط دست‌نویس) |
| Chart.js / Recharts | یک `<span class="bar">` با `inlineSize` درصدی |
| `axios` | `fetch` بومی با یک wrapper به‌نام `request()` |
| `react-hook-form` / Formik | `useState` ساده در هر فرم |
| `lodash` | چند تابع کوچک در `format.js` و `blend.js` |
| TypeScript | JavaScript ساده با کامنت‌های توضیحی |
| Jest | تست‌ها با **Vitest** نوشته شده‌اند؛ دو تست کامپوننتی محیط خود را به jsdom عوض می‌کنند |
| Playwright برای تست | هست، ولی فقط برای رندر PDF همین مستندات (`npm run docs:pdf`) — نه برای تست end-to-end |
| کتابخانهٔ سئو (`next-seo` و مانندش) | `shared/seo.js` دست‌نویس + `Metadata API` خودِ Next |
| ESLint / Prettier (config) | فقط چند `eslint-disable-next-line` پراکنده |
| Docker | اجرای مستقیم روی ماشین |

دربارهٔ `axios`: کل لایهٔ شبکه یک تابع ۳۵ خطی است که همان کاری را می‌کند
که پروژه لازم دارد — تنظیم هدرها، مدیریت توکن، تجزیهٔ JSON و **تبدیل
خطای شبکه به پیام فارسی**:

```js
} catch {
  /* سرور خاموش است یا شبکه قطع است */
  throw new Error('ارتباط با سرور برقرار نشد. مطمئن شوید سرور روشن است.');
}
```

این پیام برای کاربر ایرانیِ روی ویندوز، بسیار مفیدتر از
`Network Error` است.

دربارهٔ تست: مورد ۱۱ فصل ۱۱ رفع شد. منطق قیمت‌گذاری در `pricing.js` و
ریاضی میکس در `blend.js` توابع خالص (pure function) اند و همین باعث شد
تست‌نویسی ارزان تمام شود — بیست‌ودو فایل و ۳۸۰ سنجه، بدون مونگو.

---

## ۲.۱۲ متغیرهای محیطی

دو فایل تنظیمات جدا داریم، چون دو فرآیند جدا داریم:
`server/.env.example` → `server/.env`، و `web/.env.example` →
`web/.env.local`. هیچ‌کدام از آن دو فایلِ واقعی در مخزن نیستند.

### سرور — `server/.env.example`

```ini
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/ghahve
JWT_SECRET=یک-رشتهٔ-تصادفی-بلند-اینجا-بگذارید
TOKEN_HOURS=12
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me
SITE_URL=http://localhost:3000
CLIENT_ORIGIN=http://localhost:3000
RATE_LIMIT_LOGIN_MAX=5
RATE_LIMIT_LOGIN_WINDOW_MIN=15
RATE_LIMIT_ORDER_MAX=5
RATE_LIMIT_ORDER_WINDOW_MIN=60
RATE_LIMIT_TRACK_MAX=20
RATE_LIMIT_TRACK_WINDOW_MIN=15
# RATE_LIMIT_DISABLED=1
# TRUST_PROXY=1
```

| متغیر | استفاده | فایل | اگر نباشد |
|---|---|---|---|
| `PORT` | پورت شنود API | `index.js` | ۴۰۰۰ |
| `MONGODB_URI` | رشتهٔ اتصال؛ برای Atlas فقط همین عوض می‌شود | `db.js` | **سرور بالا نمی‌آید** |
| `JWT_SECRET` | کلید امضای توکن | `middleware/auth.js` | **ورود کار نمی‌کند** |
| `TOKEN_HOURS` | عمر توکن | `middleware/auth.js` | ۱۲ ساعت |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | حساب اولیه، فقط در seed | `seed.js` | `admin` / `change-me` |
| `SITE_URL` | آدرس عمومی سایت — پایهٔ لینک‌های `sitemap.xml` و `robots.txt` | `lib/siteUrl.js` | از هدر `Host` ساخته می‌شود |
| `CLIENT_ORIGIN` | مبدأهای مجاز CORS، جدا با کاما | `lib/cors.js` | در توسعه باز، **در تولید خطای مرگبار** |
| `RATE_LIMIT_LOGIN_*` | سقف ورود مدیر | `middleware/rateLimit.js` | ۵ در ۱۵ دقیقه |
| `RATE_LIMIT_ORDER_*` | سقف ثبت سفارش | `middleware/rateLimit.js` | ۵ در ۶۰ دقیقه |
| `RATE_LIMIT_TRACK_*` | سقف پیگیری سفارش | `middleware/rateLimit.js` | ۲۰ در ۱۵ دقیقه |
| `RATE_LIMIT_DISABLED` | خاموش کردن دستی محدودیت | `middleware/rateLimit.js` | روشن (در تست همیشه خاموش) |
| `TRUST_PROXY` | خواندن IP واقعی از `X-Forwarded-For` | `index.js` | خاموش، مگر در تولید |

`NODE_ENV` در این فایل نوشته نمی‌شود؛ آن را دستور اجرا تعیین می‌کند. با
`production` سه چیز عوض می‌شود: `CLIENT_ORIGIN` اجباری می‌شود، HSTS روشن
می‌شود، و اعتماد به پراکسی خودبه‌خود فعال می‌شود.

### وب — `web/.env.example`

```ini
API_URL=http://localhost:4000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_OG_IMAGE=/img/og-default.png
```

| متغیر | استفاده | فایل | اگر نباشد |
|---|---|---|---|
| `API_URL` | آدرس Express — فقط روی سرور: پراکسی و خواندن داده | `next.config.mjs`، `lib/data.js` | `http://localhost:4000` |
| `NEXT_PUBLIC_SITE_URL` | پایهٔ canonical و og:url و آدرس‌های Product schema | `lib/site.js` | آدرس‌ها نسبی می‌شوند |
| `NEXT_PUBLIC_OG_IMAGE` | تصویر پیش‌نمایش لینک وقتی کالا عکس ندارد | `lib/site.js` | `/img/og-default.png` |

> هرچه با `NEXT_PUBLIC_` شروع شود به مرورگر هم می‌رسد؛ `API_URL` عمداً
> این پیشوند را ندارد، چون آدرس داخلی است و مرورگر همیشه مسیر نسبی
> می‌زند.

### دو جفتی که باید با هم بخوانند

**۱) `SITE_URL` و `NEXT_PUBLIC_SITE_URL` باید دقیقاً یکی باشند.** این دو
یک چیز را می‌سازند از دو طرف: Next با دومی `canonical` و `og:url` هر
صفحه را می‌نویسد، و Express با اولی لینک‌های داخل `sitemap.xml` و خط
`Sitemap:` در `robots.txt` را. اگر فرق کنند، نقشهٔ سایت به آدرسی اشاره
می‌کند که `canonical` همان صفحه تأییدش نمی‌کند — و گوگل دو نسخه از یک
صفحه می‌بیند.

**۲) هر دو آدرسِ سایت‌اند، نه آدرس API.** این نکته‌ای است که به‌سادگی
اشتباه می‌شود: `SITE_URL` در فایل سرور نوشته می‌شود ولی مقدارش پورت
**۳۰۰۰** است، نه ۴۰۰۰. بازدیدکننده صفحه‌ها را از Next می‌گیرد، پس
`<loc>`های نقشهٔ سایت هم باید به همان‌جا اشاره کنند؛ با ۴۰۰۰، هر لینکِ
نقشهٔ سایت به سروری می‌رسید که فقط JSON می‌دهد. همین برای
`CLIENT_ORIGIN`: مبدأیی که مرورگر از آن درخواست می‌زند ۳۰۰۰ است.

> **هشدار امنیتی**
> این هشدار **رفع شده** (مورد ۶): تصمیم به `server/src/lib/cors.js`
> منتقل شد و در تولید، نبودِ `CLIENT_ORIGIN` خطای مرگبار است، نه
> پیش‌فرضِ نرم. متن زیر تاریخِ همان تصمیم است.
>
> پیش‌تر نوشته بود:
> ```js
> app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || true }));
> ```
> اگر `CLIENT_ORIGIN` تنظیم نشده باشد، مقدار `true` یعنی **هر مبدأیی
> مجاز است**. در توسعه راحت است، در تولید خطرناک. باید در محیط تولید
> حتماً مقداردهی شود.

فایل `.env` در `.gitignore` است و فقط `.env.example` در مخزن می‌ماند —
با هشدار صریح در خودش: «این فایل را در جایی منتشر نکنید.»
