# ۳. ساختار پوشه‌ها و معماری کلی

## ۳.۱ درخت کامل پروژه

```
Ghahve/
├── README.md                    معرفی انگلیسی پروژه
├── .gitignore  .gitattributes  .git-blame-ignore-revs
├── .prettierrc  .prettierignore  eslint.config.mjs  vitest.config.mjs
├── package.json                 ریشهٔ workspace‌ها + اسکریپت‌ها
│
├── img/                         ۱۱ فایل SVG — تنها بازماندهٔ نسخهٔ ایستای اولیه
│                                (نسخه‌شان در web/public/img/ است و همان سرو می‌شود)
│
├── .github/workflows/ci.yml     نصب · ESLint · Prettier · تست · build
│
├── tests/                       Vitest — از ریشه، روی هر سه workspace
│   ├── pricing.test.js          پله‌های تخفیف، ارسال، قیمت میکس
│   ├── blend.test.js            جابه‌جایی درصدها
│   ├── blend-visual.test.js     زمان‌بندی و هندسهٔ حالت تصویری
│   ├── card-art.test.js         escape شدن نام کالا داخل SVG
│   ├── cart-storage.test.js     بازاعتبارسنجی سبدِ ذخیره‌شده
│   ├── cart-hydration.test.jsx  سبد در چرخهٔ «رندر سرور ← hydrate»  (jsdom)
│   ├── item-card.test.jsx       لینک واقعی کارت به صفحهٔ کالا       (jsdom)
│   ├── item-detail.test.jsx     مودال کالا بدون ShopProvider        (jsdom)
│   ├── share.test.js            نشانی هم‌رسانی و انتخابِ راه بر پایهٔ نشانگر
│   ├── toast-store.test.js      عمر پیام، مشترک‌ها، و snapshot سرور
│   ├── item-routes.test.js      شکل آدرس کالا و نگاشت نوع ↔ بخش
│   ├── next-routes.test.js      هر نوع کالا پوشهٔ مسیر خودش را دارد
│   ├── next-metadata.test.js    headTags ↔ شیء metadata نکست
│   ├── json-ld.test.js          Product و LocalBusiness، و بی‌خطر بودن متن
│   ├── sitemap.test.js          XML نقشهٔ سایت و بیرون ماندن کالای خاموش
│   ├── stock.test.js            رزرو و پس‌دادن موجودی
│   ├── track.test.js            پیگیری سفارش و نمای عمومی
│   ├── upload.test.js           فهرست مجاز و هدرهای /uploads
│   ├── cors.test.js             تصمیم CORS
│   ├── rate-limit.test.js       خاموش بودن محدودیت در محیط تست
│   ├── jalali.test.js           تقویم شمسی و بازه‌بندی
│   └── taxonomy.test.js         هم‌پوشانی کلیدهای shared و برچسب‌ها
│
├── docs/                        همین مستندات + README-fa.md
│
├── scripts/
│   ├── og-image.mjs             ساخت تصویر پیش‌نمایش لینک (og-default.png)
│   └── docs/                    ساخت documentation.html و PDF فارسی
│       ├── build.mjs  diagrams.mjs  paginator.js
│       ├── render.mjs  check-svg.mjs  zoom.mjs
│       └── fonts/               وزیرمتن و JetBrains Mono، درون‌خط در HTML
│
├── shared/                    ★ workspace مشترک — @ghahve/shared
│   ├── package.json             سه export، بدون هیچ وابستگی
│   ├── pricing.js               تنها نسخهٔ محاسبهٔ قیمت
│   ├── taxonomy.js              تنها نسخهٔ کلیدهای مجاز
│   └── seo.js                   آدرس کالا، متن <head>، JSON-LD، sitemap و robots
│
├── web/                         فروشگاه و پنل — Next.js (App Router)
│   ├── package.json
│   ├── next.config.mjs          پراکسی، بستهٔ مشترک، و بهینه‌ساز تصویر
│   ├── .env.example             API_URL و NEXT_PUBLIC_*
│   ├── public/img/              همان ۱۱ SVG + og-default.png
│   ├── .next/                   خروجی build (در .gitignore)
│   └── src/
│       ├── proxy.js             CSP با nonce + بقیهٔ هدرهای امنیتی صفحه
│       ├── style.css            استایل فروشگاه
│       ├── admin.css            استایل پنل + چاپ رسید
│       │
│       ├── app/                 ★ جدول مسیرها = ساختار پوشه‌ها
│       │   ├── layout.jsx       پوستهٔ rtl، فونت‌ها، شکاف مودال، توست، force-dynamic
│       │   ├── page.jsx         صفحهٔ اصلی — کالاها و متن‌ها را روی سرور می‌خواند
│       │   ├── fonts.js         Vazirmatn + Lalezar با next/font
│       │   ├── error.jsx        خطای ساخت صفحه (۵۰۰)
│       │   ├── not-found.jsx    آدرس ناشناخته (۴۰۴)
│       │   ├── _item/           پیاده‌سازی مشترک صفحهٔ کالا، مودال و ۴۰۴ کالا
│       │   │   ├── itemRoute.jsx       صفحهٔ کامل (سروری) + generateMetadata
│       │   │   ├── itemModalRoute.jsx  نیمهٔ سروریِ مودال
│       │   │   ├── ItemModal.jsx       نیمهٔ مشتریِ مودال (router.back)
│       │   │   ├── ItemBuyCard.jsx     ستون خرید — تنها تکهٔ مشتریِ صفحه
│       │   │   └── ItemNotFound.jsx    ۴۰۴ کالا، با metadata خودش
│       │   ├── coffee/[slug]/   ─┐  page.jsx + not-found.jsx
│       │   ├── gear/[slug]/      ├ سه پوشه، یک پیاده‌سازی
│       │   ├── powder/[slug]/   ─┘
│       │   ├── @modal/          مسیرهای رهگیری‌شده: مودال روی صفحهٔ فعلی
│       │   ├── track/           پیگیری سفارش
│       │   └── admin/
│       │       ├── layout.jsx       نشست (بیرونِ دروازه — ورود هم لازمش دارد)
│       │       ├── page.jsx         هدایت به /admin/items
│       │       ├── login/
│       │       └── (panel)/         دروازه + هشت صفحه
│       │
│       ├── context/
│       │   ├── ShopContext.jsx  کالاها، سبد، محتوا، آسیاب
│       │   └── AuthContext.jsx  نشست مدیر
│       │
│       ├── lib/
│       │   ├── api.js           تنها لایهٔ ارتباط مرورگر با سرور
│       │   ├── data.js          خواندن داده روی سرور (cache ری‌اکت)
│       │   ├── metadata.js      از توصیفِ <head> به شیء metadata نکست
│       │   ├── site.js          آدرس پایه و تصویر پیش‌نمایش، از محیط
│       │   ├── cartStorage.js   خواندن و نوشتن سبد، با حافظهٔ تزریق‌شده
│       │   ├── seo.js           JSON-LD و ساعت کار ماشین‌خوان
│       │   ├── share.js         نشانی هم‌رسانی، کپی، و قاعدهٔ نوعِ نشانگر
│       │   ├── toastStore.js    انبارهٔ پیام کوتاه، بیرون از هر کانتکست
│       │   ├── img.js           کدام تصویر بهینه می‌شود و کدام خام می‌ماند
│       │   ├── blend.js         ریاضی جابه‌جایی درصدها
│       │   ├── blendVisual.js   زمان‌بندی و هندسهٔ حالت تصویری
│       │   ├── cartLine.js      شکل ردیف سبد — مشترک بین دو حالت
│       │   ├── groups.js        برچسب فارسیِ کلیدهای shared
│       │   ├── format.js        عدد، پول، وزن، تاریخ
│       │   ├── art.js           تولید SVG + esc
│       │   ├── useReveal.js     انیمیشن ورود کارت‌ها
│       │   └── useStorefrontRefresh.js  باطل‌کردن کش مسیریاب بعد از تغییر
│       │
│       └── components/
│           ├── Header.jsx           هدر چسبان + منو + دکمهٔ سبد
│           ├── SiteHeader.jsx       هدر + کشوی سبد (صاحبِ حالتِ باز/بسته)
│           ├── HomeShell.jsx        بدنهٔ صفحهٔ اصلی — نگه‌دارندهٔ فیلترها
│           ├── Hero.jsx             تصویر اصلی + «ترازوی قیمت»
│           ├── CatalogSection.jsx   یک کامپوننت برای هر سه فهرست
│           ├── ItemCard.jsx         کارت واحد سه‌نوعه
│           ├── ItemDetail.jsx       مودال «دربارهٔ این قهوه»
│           ├── ItemBody.jsx         متنِ کالا — سروری، مشترک صفحه و مودال
│           ├── CardArt.jsx          تصویر کارت — طرح تولیدی یا عکس بهینه‌شده
│           ├── ShareButton.jsx      دکمهٔ هم‌رسانی — روی کارت و مودال
│           ├── Toast.jsx            پیام کوتاه — یک بار، در پوستهٔ ریشه
│           ├── CartDrawer.jsx       سبد + فرم + رسید
│           ├── Receipt.jsx          شکل رسید — مشترک کشو و صفحهٔ پیگیری
│           ├── PrintSheet.jsx       میزبان چاپ — رسید، فرزند مستقیمِ بدنه
│           ├── BlendsSection.jsx    ساز میکس — میزبان هر دو حالت
│           ├── MixVisual.jsx        حالت تصویری: کیسه، قیف، دستگاه
│           ├── BeanPicker.jsx       فهرست افزودن دانه (مشترک)
│           ├── ContentSections.jsx  بخش‌های قابل‌ویرایش از پنل
│           ├── StaticSections.jsx   بخش‌های ثابت
│           ├── Track.jsx            فرم و نتیجهٔ پیگیری سفارش
│           └── admin/
│               ├── AdminShell.jsx       نوار بالا + دروازهٔ نشست
│               ├── AdminLogin.jsx
│               ├── AdminItems.jsx       فهرست کالاها
│               ├── AdminItemForm.jsx    فرم با پیش‌نمایش زنده
│               ├── AdminOrders.jsx
│               ├── OrderDetail.jsx      قطعهٔ مشترک سفارش‌ها و گزارش‌ها
│               ├── AdminReports.jsx     گزارش شمسی
│               ├── AdminContent.jsx     فرم ساخته‌شده از schema
│               ├── contentSchema.js     توصیف فیلدهای محتوا
│               ├── AdminClub.jsx
│               └── AdminSettings.jsx
│
└── server/                      API — Express + Mongoose
    ├── package.json
    ├── .env                     محرمانه (در .gitignore)
    ├── .env.example             نمونهٔ قابل انتشار
    ├── uploads/                 تصویرهای آپلودی (فقط .gitkeep در git)
    └── src/
        ├── index.js             compression، helmet، CORS، روترها، خطاها
        ├── db.js                اتصال Mongoose
        ├── seed.js              پر کردن اولیهٔ پایگاه داده
        │
        ├── middleware/
        │   ├── auth.js          signToken + requireAdmin
        │   └── rateLimit.js     سه محدودکننده: ورود، سفارش، پیگیری
        │
        ├── lib/
        │   ├── jalali.js        تقویم شمسی + بازه‌بندی گزارش
        │   ├── stock.js         رزرو و پس‌دادن اتمی موجودی
        │   ├── track.js         پیگیری سفارش + نمای عمومی
        │   ├── cors.js          تصمیم CORS، جدا و تست‌پذیر
        │   ├── siteUrl.js       آدرس پایهٔ عمومی — از SITE_URL یا از خود درخواست
        │   └── upload.js        multer + هدرهای سخت‌گیر /uploads
        │
        ├── models/
        │   ├── Item.js          مدل واحد سه‌نوعه + stock
        │   ├── Order.js         سفارش با snapshot قیمت
        │   ├── Admin.js         حساب مدیر
        │   ├── ClubMember.js    عضو باشگاه
        │   └── Content.js       متن‌های سایت
        │
        ├── routes/
        │   ├── auth.js          ورود، بررسی نشست، تغییر رمز
        │   ├── items.js         CRUD کالا + آپلود + یک کالای عمومی
        │   ├── orders.js        ثبت سفارش + پیگیری + مدیریت
        │   ├── content.js       خواندن/نوشتن/بازنشانی محتوا
        │   ├── club.js          عضویت + CSV
        │   ├── stats.js         پرفروش‌ها و پیشنهاد ما
        │   ├── reports.js       گزارش شمسی + خروجی استریمی
        │   └── seo.js           sitemap.xml و robots.txt — در ریشه، نه زیر /api
        │
        └── data/
            ├── default-content.js متن اولیهٔ هفت بخش
            ├── seed-items.js      ۱۰۶ کالا
            └── seed-enrich.js     برچسب طعمی، معرفی، ترکیب میکس
```

> **نکته**
> این پروژه یک **npm workspace** است. یک `npm install` در ریشه هر سه بستهٔ
> `shared`، `server` و `web` را نصب می‌کند و فقط یک `package-lock.json`
> در ریشه وجود دارد. در `server` یا `web` جداگانه `npm install` نزنید.

---

## ۳.۲ معماری لایه‌به‌لایه

```
┌──────────────────────────────────────────────────────────────┐
│  مرورگر                                                       │
│                                                              │
│  کامپوننت‌های مشتری ─► Context (Shop, Auth) ─► lib/api.js       │
│         │                    │                                │
│         └── lib/blend.js ────┘                                │
│             lib/blendVisual.js, cartLine.js                   │
│             lib/art.js, format.js, groups.js                  │
└───────────────────────────────┬──────────────────────────────┘
                                │ fetch (نسبی: /api/…)
                                ▼
┌──────────────────────────────────────────────────────────────┐
│  Next.js (پورت ۳۰۰۰)                                          │
│                                                              │
│  app/** روی سرور رندر می‌شود ─► lib/data.js ─► fetch مطلق       │
│  proxy.js: CSP با nonce                                       │
│  rewrites: /api · /uploads · sitemap.xml · robots.txt         │
└───────────────────────────────┬──────────────────────────────┘
                                │
   ┌──────────────────┐         ▼
   │  @ghahve/shared  │  ┌──────────────────────────────────────┐
   │  pricing.js      │  │  Express (پورت ۴۰۰۰) — فقط API        │
   │  taxonomy.js     │  │                                      │
   │  seo.js          │  │  compression ─► helmet ─► cors ─►     │
   └──────┬───────────┘  │  rateLimit ─► routes/* ─► models/*    │
          │              │      │                          │     │
          └─────────────►│      └──►  lib/stock.js         │     │
                         │           lib/track.js          │     │
                         │           lib/jalali.js         │     │
                         │           lib/upload.js         │     │
                         └─────────────────────────────────┼─────┘
                                                           │ Mongoose
                                                           ▼
                                                ┌────────────────────┐
                                                │  MongoDB           │
                                                │  items, orders,    │
                                                │  admins, contents, │
                                                │  clubmembers       │
                                                └────────────────────┘
```

**چهار لایه، سه بسته، و یکی از آن‌ها زیر بقیه.** تا پیش از مورد ۲۶ سه
لایه بود؛ حالا Next بین مرورگر و Express نشسته و صفحه‌ها را همان‌جا
می‌سازد. `shared/` در هیچ‌کدام از این لایه‌ها نیست — زیر هر سه است.

و یک نکتهٔ تازه از مورد ۲۶: «مرورگر» دیگر تنها مصرف‌کنندهٔ API نیست. Next
هم روی سرور از همان API می‌خواند — با آدرس مطلق، چون `fetch` روی سرور
مبدأ ندارد. برای همین دو فایل جدا هست: `lib/api.js` برای مرورگر (مسیر
نسبی) و `lib/data.js` برای سرور (`API_URL`). هر چیزی که دو طرف باید **یکسان** ببینند آنجاست و هر دو
طرف با همان نام import ‌می‌کنند:

```js
import { computeTotals } from '@ghahve/shared/pricing.js'; // هر دو طرف
import { KINDS } from '@ghahve/shared/taxonomy.js'; //         هر دو طرف
```

---

## ۳.۳ اصل‌های سازمان‌دهی کد

### الف) پوشه بر پایهٔ **نقش**، نه بر پایهٔ ویژگی

در سمت وب، فایل‌ها بر اساس نقش فنی گروه‌بندی شده‌اند
(`components/`, `lib/`, `context/`) نه بر اساس دامنه
(`features/cart/`, `features/blend/`). پوشهٔ `pages/` که در نسخهٔ ویت
کنارشان بود دیگر وجود ندارد: جای صفحه‌ها را `app/` گرفته و آنجا ساختار
پوشه‌ها **جدول مسیرهاست**، نه یک گروه‌بندی سلیقه‌ای.

این انتخاب برای پروژه‌ای در این اندازه مناسب است، چون منطق دامنه‌ها
درهم‌تنیده است: قیمت‌گذاری هم در کارت کالا، هم در سبد، هم در ساز میکس،
هم در تصویر اصلی استفاده می‌شود. تقسیم بر پایهٔ ویژگی، این ماژول‌های
مشترک را به یک پوشهٔ مشترک می‌راند و عملاً به همین‌جا برمی‌گشتیم.

در سمت سرور، تقسیم‌بندی کلاسیک MVC است:
`models/` (داده و قواعد) · `routes/` (کنترلر) · `lib/` (منطق دامنه) ·
`middleware/` (میان‌افزار) · `data/` (متن پیش‌فرض و seed).

### ب) `lib/` = منطق خالص، بدون React و بدون Express

هیچ‌کدام از فایل‌های `web/src/lib/*` (به‌جز `useReveal.js` و
`useStorefrontRefresh.js` که هوک‌اند) به React وابسته نیستند.
`blend.js`، `blendVisual.js`، `cartLine.js`، `format.js`، `art.js`،
`groups.js` و `img.js` توابع و ثابت‌های خالص‌اند.

دو تای تازه‌تر همین قاعده را یک پله جلوتر می‌برند: `share.js` به
`navigator` و `document` نیاز دارد ولی هر دو را **پارامتر** می‌گیرد، و
`toastStore.js` حالت نگه می‌دارد ولی با `subscribe/getSnapshot` — یعنی
یک انبارهٔ ساده که ری‌اکت از راه `useSyncExternalStore` به آن وصل می‌شود،
نه چیزی که به ری‌اکت وابسته باشد. نتیجه‌اش این است که
`tests/share.test.js` و `tests/toast-store.test.js` هر دو در محیط `node`
اجرا می‌شوند، بدون jsdom.

در سمت سرور هم `lib/jalali.js`، `lib/stock.js`، `lib/track.js` و
`lib/cors.js` هیچ ارجاعی به `req` و `res` ندارند و مستقل از Express اند.
دو تای آخر عمداً از دل `index.js` و روتر بیرون کشیده شده‌اند تا **بشود
تستشان کرد**: `resolveCorsOrigin` تصمیمی می‌گیرد که قبلاً کنارش
`process.exit` بود، و `findOrderForTracking` مدلِ سفارش را به‌عنوان
پارامتر می‌گیرد تا بدون مونگو اجرا شود. همین قاعده در `stock.js` هم
هست: `reserveStock(lines, ItemModel)`.

این خط‌کشِ ساده قاعدهٔ کارِ پروژه است: اگر منطقی نوشتید که تست کردنش
به مونگو نیاز دارد، احتمالاً باید به یک تابع خالص جدا شود.

### ج) `shared/` = منبع یگانهٔ حقیقت برای هر دو طرف

هر چیزی که مرورگر و سرور باید **دقیقاً یکسان** ببینند در بستهٔ
`@ghahve/shared` است، نه در دو کپیِ آینه‌ای. سه فایل آنجاست:

| فایل | چه چیزی | چه کسی می‌خواند |
|---|---|---|
| `shared/pricing.js` | پله‌های تخفیف، ارسال، گِرد کردن، قیمت میکس | وب برای نمایش، سرور برای ثبت |
| `shared/taxonomy.js` | کلیدهای مجاز: نوع، دسته، طرح، جنس، رنگ، طعم، آسیاب | سرور برای اعتبارسنجی، وب برای برچسب |
| `shared/seo.js` | `itemPath`، عنوان و توضیح صفحه، JSON-LD، `buildSitemap`، `buildRobots` | وب برای `generateMetadata`، سرور برای `sitemap.xml` |

`seo.js` تنها جای این بسته است که **متن فارسی** دارد، و این یک استثنای
مستند است نه بی‌دقتی: عنوان و توضیحِ صفحهٔ کالا هم در متادیتای Next لازم
است و هم — تا وقتی نقشهٔ سایت را Express می‌سازد — در سرور. دو نسخه شدنش
یعنی چیزی که در تلگرام دیده می‌شود با تبِ مرورگر فرق کند. مرزش دقیق است:
**محتوای صفحه** در shared، **برچسب رابط کاربری** در `web/src/lib/groups.js`.

مدل `Item` مستقیماً از همان بسته اعتبارسنجی می‌کند:

```js
import { KINDS, GROUPS_BY_KIND, GEAR_SHAPES, GEAR_MATERIALS,
         POWDER_SHAPES, POWDER_TONES, IS_WEIGHED, TASTE_KEYS }
  from '@ghahve/shared/taxonomy.js';
```

این یک زنجیرهٔ ظریف است: `taxonomy.js` (shared) ← `art.js` (کلاینت). اگر
شکلی در فهرست طرح‌ها نباشد، مدل اجازه نمی‌دهد ذخیره شود و کارتِ خالی
رندر نمی‌شود.

### د) تقسیمِ کلید و برچسب — عمدی، نه تکراری

`shared/taxonomy.js` فقط **کلید** دارد؛ برچسب فارسیِ هر کلید در
`web/src/lib/groups.js` است. این دوتایی *دوگانگی* نیست، تقسیم کار است:
سرور با متن فارسی کاری ندارد و بردنِ آن به shared فقط بار اضافه بود.

قاعدهٔ کار: کلید تازه اول در `shared/taxonomy.js` اضافه می‌شود، بعد
برچسبش در `groups.js`. و برای اینکه کسی نیمهٔ دوم را فراموش نکند، یک
تست هر دو سمت را می‌سنجد:

```js
// tests/taxonomy.test.js
it('دسته‌های قهوه', () => sameKeys(GROUPS, GROUPS_BY_KIND.coffee));
it('طرح‌های ابزار', () => sameKeys(GEAR_SHAPES, GEAR_SHAPE_KEYS));
```

`sameKeys` نه یکی کم را می‌بخشد و نه یکی زیاد را — یعنی کلیدِ بی‌برچسب و
برچسبِ بی‌کلید هر دو CI را قرمز می‌کنند.

> **نکته**
> پیش از این، `pricing.js` واقعاً دو نسخه داشت (یکی در client، یکی در
> server) که باید دستی همگام می‌ماندند. خطرش این بود که کسی پله‌های
> تخفیف را در یکی عوض کند و عددی که مشتری می‌بیند با عددی که ثبت می‌شود
> فرق کند — بی هیچ خطایی. حالا یک فایل بیشتر نیست، پس واگرایی از اساس
> ممکن نیست. این جای بازمحاسبهٔ سمت سرور را **نمی‌گیرد**؛ فقط تضمین
> می‌کند نتیجه با آنچه کاربر دیده یکی دربیاید.

---

## ۳.۴ چرخهٔ عمر یک درخواست

بیایید یک درخواست کامل را از ابتدا تا انتها دنبال کنیم — «ثبت سفارش».

**۱) مرورگر.** `CartDrawer.submit()` فراخوانی می‌شود.

```js
const res = await api.placeOrder({
  lines: resolved.map((l) => l.kind === 'gear'
    ? { slug: l.slug, qty: l.qty }
    : { slug: l.slug, grams: l.grams,
        ...(l.item.grindable ? { grind: l.grind || 'whole' } : {}),
        ...(l.item.isBlend && l.mix?.length ? { mix: l.mix } : {}) }),
  customer: { name, phone, address, note }
});
```

توجه کنید که **هیچ قیمتی فرستاده نمی‌شود**.

**۲) لایهٔ api.** تابع `request()` در `web/src/lib/api.js`:

```js
res = await fetch(url, { method, headers, body: JSON.stringify(body) });
```

آدرس `'/api/orders'` نسبی است.

**۳) proxy.** Next این درخواست را به `localhost:4000` می‌فرستد (بند
`rewrites` در `next.config.mjs`).
در تولید، همان سروری که HTML را داد، درخواست را می‌گیرد.

**۴) میان‌افزارهای Express.** به ترتیب `helmet` (هدرهای امنیتی و CSP)،
`cors` (با مبدأهای مجاز از `CLIENT_ORIGIN`)، سپس
`express.json({limit:'1mb'})` که بدنه را تجزیه می‌کند.

**۵) مسیریابی.** `app.use('/api/orders', orderRoutes)` → روتر → `POST /`.
این مسیر **`requireAdmin` ندارد** چون مشتری باید بتواند سفارش بدهد؛ به‌جای
آن `orderLimiter` جلویش نشسته: پیش‌فرض ۵ سفارش در ساعت از هر IP.

**۶) منطق تجاری.** بازخوانی کالاها از پایگاه داده، اعتبارسنجی هر ردیف،
و بازمحاسبهٔ کامل قیمت با `computeTotals` (جزئیات در فصل ۶ و ۷).

**۷) رزرو موجودی.** آخرین کار پیش از ثبت: `reserveStock(lines, Item)` هر
ردیفِ شمرده‌شده را با یک `findOneAndUpdate` اتمی کم می‌کند. اگر ردیفی
نرسد، هرچه تا آنجا برداشته شده پس داده می‌شود و پاسخ **۴۰۹** برمی‌گردد —
نه ۴۰۰، چون ورودی مشتری غلط نبود؛ انبار عوض شده بود.

**۸) لایهٔ داده.** `Order.create(...)` → قلاب `pre('validate')` شمارهٔ
سفارش را می‌سازد → Mongoose اعتبارسنجی می‌کند → درج در MongoDB. اگر همین
درج شکست بخورد، `releaseStock(taken, Item)` رزروها را برمی‌گرداند و بعد
خطا را بالا می‌فرستد.

**۹) پاسخ.** از روی **سند ذخیره‌شده** ساخته می‌شود:

```js
res.status(201).json({
  ok: true, code: order.code, createdAt: order.createdAt,
  lines: order.lines, customer: order.customer, totals: order.totals
});
```

**۱۰) مسیر خطا.** اگر هر جای این زنجیره خطایی بیفتد، `next(err)` آن را به
مبدل خطای سراسری در `index.js` می‌فرستد که به پیام فارسی و کد وضعیت
مناسب تبدیلش می‌کند.

**۱۱) بازگشت به مرورگر.** `setDone(res)` → `clearCart()` → کامپوننت
`Receipt` رسید را از روی پاسخ سرور می‌سازد. شمارهٔ سفارشِ روی رسید همان
چیزی است که بعداً در `/track` به‌کار می‌آید.

---

## ۳.۵ لایهٔ ارتباط با سرور

فایل `web/src/lib/api.js` تنها جایی است که `fetch` صدا زده می‌شود.
ساختارش سه بخش دارد:

**بخش یک — مدیریت توکن:**

```js
const TOKEN_KEY = 'ghahve.admin.token';
export const getToken   = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken   = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };
```

آن `onUnauthorized` یک الگوی ظریف است: `api.js` هیچ وابستگی‌ای به React
ندارد، اما باید بتواند به React خبر بدهد که «نشست منقضی شد». به‌جای
import کردن context (که وابستگی حلقوی می‌ساخت)، یک قلاب می‌گذارد و
`AuthContext` آن را پر می‌کند:

```js
// web/src/context/AuthContext.jsx
useEffect(() => {
  setUnauthorizedHandler(() => setAdmin(null));
}, []);
```

**بخش دو — تابع `request()` یکتا:**

```js
async function request(url, { method = 'GET', body, auth = false, raw = false } = {}) {
  const headers = {};
  if (!raw && body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) headers.Authorization = `Bearer ${getToken()}`;
  ...
  if (!res.ok) {
    if (res.status === 401 && auth) { clearToken(); onUnauthorized(); }
    throw new Error(data?.error || `خطای سرور (${res.status})`);
  }
  return data;
}
```

پرچم `raw` برای آپلود فایل است: وقتی بدنه `FormData` باشد، **نباید**
`Content-Type` دستی تنظیم شود، چون مرورگر باید خودش `boundary` را اضافه
کند.

**بخش سه — شیء `api` با ۳۰ متد** که به گروه‌های منطقی تقسیم شده‌اند:
فروشگاه، باشگاه، ورود، مدیریت کالا، مدیریت سفارش، محتوا، گزارش.

علاوه بر این، یک تابع `download()` جداگانه وجود دارد برای فایل‌های
محافظت‌شده. مشکل این است که لینک ساده (`<a href>`) نمی‌تواند هدر
`Authorization` بفرستد. راه‌حل: فایل را با `fetch` بگیر، به `Blob` تبدیل
کن، یک `<a download>` موقت بساز، کلیک کن و پاکش کن:

```js
const blob = await res.blob();
const href = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = href; a.download = name;
document.body.appendChild(a); a.click(); a.remove();
URL.revokeObjectURL(href);
```

و نام فایل از هدر `Content-Disposition` سرور خوانده می‌شود — با پشتیبانی
از شکل `filename*=UTF-8''...` که برای نام‌های فارسی لازم است.

---

## ۳.۶ نقشهٔ کامل API

| متد | مسیر | دسترسی | خروجی |
|---|---|---|---|
| `GET` | `/api/health` | عمومی | `{ok:true}` |
| `POST` | `/api/auth/login` | عمومی (با محدودیت نرخ) | `{token, admin}` |
| `GET` | `/api/auth/me` | مدیر | `{admin}` |
| `POST` | `/api/auth/change-password` | مدیر | `{ok, token, admin}` |
| `GET` | `/api/items?kind=` | عمومی | آرایهٔ کالاهای `active` |
| `GET` | `/api/items/:kind/:slug` | عمومی | یک کالای **روشن**؛ ۴۰۴ اگر نباشد یا خاموش باشد |
| `GET` | `/api/items/admin/all?kind=&q=` | مدیر | همه، با جست‌وجو |
| `GET` | `/api/items/admin/:id` | مدیر | یک کالا |
| `POST` | `/api/items` | مدیر | کالای ساخته‌شده (۲۰۱) |
| `PUT` | `/api/items/:id` | مدیر | کالای به‌روزشده |
| `PATCH` | `/api/items/:id/active` | مدیر | کالا با `active` معکوس |
| `DELETE` | `/api/items/:id` | مدیر | `{ok, id}` |
| `POST` | `/api/items/upload` | مدیر | `{url}` |
| `POST` | `/api/orders` | **عمومی** (با محدودیت نرخ) | رسید کامل (۲۰۱) |
| `GET` | `/api/orders/track?code=&phone=` | **عمومی** (با محدودیت نرخ) | نمای عمومی سفارش |
| `GET` | `/api/orders?status=` | مدیر | `{orders, counts}` |
| `GET` | `/api/orders/:id` | مدیر | یک سفارش |
| `PATCH` | `/api/orders/:id/status` | مدیر | سفارش به‌روزشده |
| `DELETE` | `/api/orders/:id` | مدیر | `{ok, id}` |
| `GET` | `/api/content` | عمومی | شیء هفت‌کلیده |
| `PUT` | `/api/content/:key` | مدیر | `{ok, key, data}` |
| `POST` | `/api/content/:key/reset` | مدیر | `{ok, key, data}` |
| `POST` | `/api/club` | عمومی | `{ok, already, name}` |
| `GET` | `/api/club?q=` | مدیر | `{members, total}` |
| `DELETE` | `/api/club/:id` | مدیر | `{ok, id}` |
| `GET` | `/api/club/export.csv` | مدیر | فایل CSV |
| `GET` | `/api/stats/top-sellers?limit=` | عمومی | آرایهٔ کالا با `sales` |
| `GET` | `/api/stats/featured?limit=` | عمومی | آرایهٔ کالا |
| `GET` | `/api/reports/summary?period=&count=` | مدیر | `{buckets, windowTotals, allTime}` |
| `GET` | `/api/reports/orders?…` | مدیر | `{orders, total, page, pages, topItems}` |
| `GET` | `/api/reports/export.csv?mode=` | مدیر | فایل CSV استریمی |
| `GET` | `/api/reports/export.json` | مدیر | فایل JSON استریمی |
| `GET` | `/sitemap.xml` | عمومی | XML از فهرست زندهٔ کالاهای روشن |
| `GET` | `/robots.txt` | عمومی | متن، با اشاره به sitemap |

دو سطر آخر عمداً **زیر `/api` نیستند**: ربات‌ها فقط در ریشه دنبالشان
می‌گردند. تنها آدرس‌های غیر-API این سرورند، و در تولید پراکسی باید همین
دو را هم — کنار `/api` و `/uploads` — به Express بفرستد، نه به Next.

`GET /api/items/:kind/:slug` با مورد ۲۶ اضافه شد: صفحهٔ کالا روی سرور
رندر می‌شود و بی‌معنی بود که برای نشان دادن یک کالا صد و شش کالا خوانده
شود. الگوی `:kind` از خودِ `taxonomy` ساخته می‌شود، پس هیچ‌وقت با
`/api/items/admin/…` اشتباه گرفته نمی‌شود.

### قرارداد پاسخ

پاسخ موفق همیشه JSON است. پاسخ خطا **همیشه** شکل `{ error: "پیام فارسی" }`
دارد و همین باعث می‌شود کلاینت با یک خط بتواند همهٔ خطاها را نشان دهد:

```js
throw new Error(data?.error || `خطای سرور (${res.status})`);
```

کدهای وضعیت به‌کاررفته:
`200` موفق · `201` ساخته شد · `400` ورودی نامعتبر ·
`401` نیاز به ورود یا نشست منقضی · `404` پیدا نشد ·
`409` تعارض با وضعیت فعلی انبار — موجودی کافی نیست ·
`429` عبور از محدودیت نرخ · `500` خطای غیرمنتظره.

فرق ۴۰۰ و ۴۰۹ عمدی است: ۴۰۰ یعنی «آنچه فرستادی غلط بود»، ۴۰۹ یعنی
«درست بود، ولی دنیا عوض شده». سبد مشتری در حالت دوم دست‌نخورده می‌ماند
و فقط پیام موجودی نشان داده می‌شود.

پاسخ ۴۲۹ هم همان شکل `{ error }` را دارد، به‌علاوهٔ هدرهای استاندارد
`RateLimit-*` (نسخهٔ draft-7) تا کلاینت بداند چقدر اعتبار مانده است.

---

## ۳.۷ مدیریت خطا در سرور

مبدل خطای سراسری در انتهای `server/src/index.js` سه دسته خطای Mongoose را
به پیام فارسی تبدیل می‌کند:

```js
app.use((err, _req, res, _next) => {
  if (err.name === 'ValidationError') {
    const first = Object.values(err.errors)[0];
    return res.status(400).json({ error: first?.message || 'اطلاعات وارد شده کامل نیست' });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    const label = { slug: 'شناسه', username: 'نام کاربری', code: 'شمارهٔ سفارش' }[field] || 'مقدار';
    return res.status(400).json({ error: `این ${label} قبلاً استفاده شده است` });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'شناسهٔ درخواستی معتبر نیست' });
  }

  console.error(err);
  res.status(500).json({ error: 'خطای غیرمنتظره در سرور' });
});
```

سه نکته:

۱) `ValidationError` پیام خودِ مدل را برمی‌گرداند — همان پیام فارسی که در
   schema نوشته شده.
۲) خطای `11000` (کلید تکراری) نام فیلد را به فارسی ترجمه می‌کند.
۳) `CastError` وقتی رخ می‌دهد که `ObjectId` نامعتبر در آدرس باشد؛
   بدون این، هر آدرس اشتباهی یک ۵۰۰ می‌داد.

خطای پیش‌بینی‌نشده `console.error` می‌شود (برای لاگ سرور) اما به کاربر
فقط پیام کلی می‌رسد — تا جزئیات داخلی نشت نکند.

---

## ۳.۸ استراتژی راه‌اندازی و تجربهٔ توسعه‌دهنده

نکته‌ای که در بیشتر پروژه‌ها نادیده گرفته می‌شود اما اینجا به آن توجه
شده، **پیام‌های خطای راه‌اندازی** است.

اگر MongoDB روشن نباشد، `server/src/db.js` این را چاپ می‌کند:

```
X  Could not connect to MongoDB.
   URI:   mongodb://127.0.0.1:27017/ghahve
   Error: connect ECONNREFUSED 127.0.0.1:27017

   Make sure the MongoDB service is running.
   In PowerShell as administrator:  net start MongoDB
```

و اگر پورت اشغال باشد، `index.js` دقیقاً دستور رفعش را می‌دهد:

```
X  Port 4000 is already in use.
   Another copy of the server is still running.
   Close it, or change PORT in server/.env

   To find and stop it on Windows (PowerShell):
     Get-NetTCPConnection -LocalPort 4000 -State Listen | Select-Object OwningProcess
     Stop-Process -Id <number-from-above> -Force
```

> **نکته**
> این پیام‌ها عمداً **انگلیسی** هستند. کامنت `db.js` دلیلش را می‌گوید:
> «پیام‌های این فایل عمداً انگلیسی‌اند: اینجا خروجیِ خط فرمان است، و
> پنجرهٔ cmd ویندوز حروف فارسی را «?» چاپ می‌کند. متن‌هایی که مشتری در
> سایت می‌بیند همچنان فارسی‌اند.»
> این یک تصمیم آگاهانه بر پایهٔ محیط اجرا است، نه بی‌دقتی.

اتصال قطع‌شده هم مدیریت می‌شود — بدون خروج از برنامه:

```js
mongoose.connection.on('disconnected', () => console.warn('.. Database disconnected, retrying'));
mongoose.connection.on('reconnected',  () => console.log('OK Database reconnected'));
```

با کامنت: «اگر وسط کار اتصال قطع شد، فقط لاگ می‌کنیم؛ mongoose خودش
دوباره وصل می‌شود.»

---

## ۳.۹ لایه‌های امنیتی سرور

امنیت اینجا یک میان‌افزار نیست، چند لایهٔ مستقل است که هر کدام یک در را
می‌بندد. ترتیبشان در `index.js` همان ترتیبی است که درخواست از آن‌ها
رد می‌شود.

### الف) `trust proxy` — پیش‌شرطِ درست کار کردن بقیه

محدودیت نرخ روی `req.ip` کلید می‌خورد. پشت nginx یا کلادفلر، `req.ip`
آدرس خودِ پراکسی است — یعنی همهٔ بازدیدکنندگان یک کلید مشترک می‌گیرند و
بعد از ۵ ورود ناموفق **کل سایت برای همه** قفل می‌شود.

```js
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}
```

اما همیشه روشن هم نمی‌شود: جایی که پراکسی نیست، هر کلاینتی می‌تواند
`X-Forwarded-For` جعلی بفرستد و با هر درخواست یک آدرس تازه بسازد — و
محدودیت نرخ عملاً بی‌اثر شود. پس فقط در تولید، یا با پرچم صریح.

### ب) helmet و CSP

**این سیاست دیگر مالِ صفحه‌ها نیست.** تا پیش از مورد ۲۶ همین سرور HTML
فروشگاه را هم می‌داد، پس باید هر چیزی را که یک صفحهٔ واقعی لازم دارد
پوشش می‌داد: فونت از گوگل، استایل درون‌خطی برای نوار نمودارها، و مانند
این‌ها. حالا این سرور فقط JSON و XML و تصویر آپلودی می‌دهد، و آنچه مانده
دو بند است:

```js
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:']
    }
  },
  strictTransportSecurity: process.env.NODE_ENV === 'production'
})
```

| بند | چرا |
|---|---|
| `defaultSrc: 'self'` | پایهٔ محافظه‌کارانه؛ بقیهٔ بندها از پیش‌فرض helmet می‌آیند و برای یک API درست‌اند |
| `imgSrc: 'data:'` | تصویرهای data URI که ممکن است در پاسخ‌های همین سرور دیده شوند |
| `scriptSrc` دست‌نخورده (`'self'`) | پاسخ‌های این سرور اسکریپتی ندارند |
| بندهای گوگل‌فونتس | **برداشته شدند** — فونت‌ها با `next/font` روی همان دامنه‌اند (مورد ۲۵) |

**سه سیاست جدا، و این عمدی است:** صفحه‌ها سیاست خودشان را از
`web/src/proxy.js` می‌گیرند (CSP با **nonce**، بدون `'unsafe-inline'` برای
اسکریپت)، پاسخ‌های API از همین helmet، و فایل‌های `/uploads` از
`lib/upload.js`. اگر چیزی در مرورگر بسته شد، اول ببینید کدام‌یک از این
سه گفته است.

`strictTransportSecurity` فقط در تولید روشن است: روی `http://localhost`
دامنهٔ localhost را برای پروژه‌های دیگر هم به https قفل می‌کرد — دردسری
که پاک کردنش از مرورگر سخت است.

### ج) CORS که در تولید سکوت نمی‌کند

قاعده در `lib/cors.js` است، جدا از `index.js`، چون تصمیمی که کنارش
`process.exit` باشد تست‌پذیر نیست:

```js
export function resolveCorsOrigin(env = process.env) {
  const origins = parseOrigins(env.CLIENT_ORIGIN);
  if (!origins.length && env.NODE_ENV === 'production') {
    throw new Error('CLIENT_ORIGIN must be set in production');
  }
  return origins.length ? origins : true;
}
```

پیش از این، نبودِ `CLIENT_ORIGIN` بی‌صدا به `origin: true` تبدیل می‌شد —
یعنی «هر مبدأیی مجاز است»، یک تنظیمِ جاافتاده و بی هیچ هشداری. حالا در
تولید خطای مرگبار است و سرور با پیام روشن بالا نمی‌آید. در توسعه هنوز
باز است تا کسی که تازه مخزن را کلون کرده بدون `.env` هم بتواند اجرا کند.

### د) محدودیت نرخ روی سه مسیرِ بی‌محافظ

| محدودکننده | مسیر | پیش‌فرض | خطر |
|---|---|---|---|
| `loginLimiter` | `POST /api/auth/login` | ۵ در ۱۵ دقیقه | امتحان کردن هزاران رمز |
| `orderLimiter` | `POST /api/orders` | ۵ در ۶۰ دقیقه | سیل سفارش جعلی |
| `trackLimiter` | `GET /api/orders/track` | ۲۰ در ۱۵ دقیقه | حدس زدن شمارهٔ سفارش |

هر سه عدد از `.env` خوانده می‌شوند تا بدون دست زدن به کد سفت یا شل شوند.
سقف پیگیری سخاوتمندتر است چون مشتری واقعی ممکن است چند بار غلط تایپ کند،
ولی آن‌قدر کم که جست‌وجوی فراگیر معنا نداشته باشد.

در محیط تست هر سه خاموش‌اند (`skip: isOff`)، وگرنه مجموعهٔ تست بعد از پنج
فراخوانی به ۴۲۹ می‌خورد. `RATE_LIMIT_DISABLED=1` همین کار را برای آزمایش
دستی می‌کند.

> **هشدار امنیتی**
> شمارندهٔ `express-rate-limit` **درون‌حافظه‌ای** است. با چند پروسه (یا
> چند نمونهٔ سرور) هر کدام شمارندهٔ خودش را دارد و سقف واقعی چند برابر
> می‌شود. برای استقرار چندپروسه‌ای باید انبارهٔ مشترک (مثلاً Redis)
> گذاشت.

### ه) پوشهٔ `/uploads` — دو لایه، نه یکی

لایهٔ اول، فهرست سفیدِ نوع فایل در `lib/upload.js`: فقط JPEG، PNG، WebP،
GIF و AVIF. **SVG عمداً نیست** — یک سند XML است، نه تصویر خام، و می‌تواند
`<script>` داشته باشد؛ و چون از همان دامنهٔ سایت سرو می‌شود آن اسکریپت به
توکن مدیر در `localStorage` هم دسترسی داشت.

لایهٔ دوم، هدرهای خودِ پوشه — چون بستن فهرست فقط جلوی آپلودِ **تازه** را
می‌گیرد و هرچه قبلاً آپلود شده هنوز روی دیسک است:

```js
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
res.setHeader('X-Frame-Options', 'DENY');
// و برای پسوندهای سندی (.svg .xml .html …):
res.setHeader('Content-Disposition', 'attachment');
```

`sandbox` سند را در مبدأ یکتا و بدون اسکریپت می‌گذارد، پس حتی SVG قدیمیِ
آلوده هم دیگر به مبدأ فروشگاه دسترسی ندارد. `Content-Disposition` روی
`<img src>` اثری ندارد، پس تصویرهای عادی سالم می‌مانند. سقف حجم ۴ مگابایت
است و نام فایل تصادفی (۱۲ بایت hex) تا نام اصلیِ فارسی یا تکراری دردسر
نسازد.

---

## ۳.۱۰ تست، لینت و یکپارچه‌سازی

### تست‌ها در ریشه می‌نشینند

`tests/` نه در web است و نه در server، چون از **هر سه** workspace
می‌خواند: منطق مشترک از `shared`، رزرو موجودی و پیگیری از `server`، و
جدول برچسب‌ها از `web`.

```js
// vitest.config.mjs
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{js,jsx}'],
    env: { TZ: 'Asia/Tehran' }
  }
});
```

`TZ` ثابت شده چون گزارش‌ها روی وقت تهران بسته می‌شوند و تست هم باید
مستقل از ساعتِ ماشینی باشد که اجرایش می‌کند.

محیط پیش‌فرض `node` است و سه استثنا دارد: `item-card.test.jsx`،
`cart-hydration.test.jsx` و `item-detail.test.jsx` با کامنت
`// @vitest-environment jsdom` بالای خودشان محیط را عوض می‌کنند —
همان‌جا، نه در این پیکربندی، تا بقیهٔ فایل‌ها بی‌جهت داخل jsdom اجرا
نشوند.

> **نکته**
> در دوران مهاجرت، این پیکربندی دو «پروژه» داشت: `client` روی ری‌اکت ۱۸
> و `web` روی ۱۹، و تستی که کامپوننت رندر می‌کند باید رندرکننده و
> کامپوننت را از یک نسخه بگیرد. با برداشته شدن `client` فقط یک نسخهٔ
> ری‌اکت ماند و آن تقسیم هم برداشته شد.

### هیچ تستی به پایگاه داده دست نمی‌زند

قاعدهٔ ثابت پروژه: هر چیزی که تست می‌شود یا تابع خالص است یا وابستگی‌اش
تزریق می‌شود. `reserveStock` مدل را پارامتر می‌گیرد، `findOrderForTracking`
هم. تست‌ها یک مدلِ قلابیِ چند خطی می‌سازند که همان `findOneAndUpdate` را
با یک شیء در حافظه شبیه‌سازی می‌کند — و شرط `$gte` را واقعاً بررسی
می‌کند، وگرنه تستِ «یک گرم بیشتر از موجودی» بی‌معنی بود.

نتیجه‌اش این است که CI به سرویس MongoDB نیاز ندارد.

### بیست‌ودو فایل تست

| فایل | چه چیزی را نگه می‌دارد |
|---|---|
| `pricing.test.js` | مرزهای دقیق پله‌ها (۹۹۹ در برابر ۱۰۰۰ گرم)، ارسال، قیمت میکس |
| `blend.test.js` | مجموع درصدها بعد از هزار حرکت تصادفی هم ۱۰۰ می‌ماند |
| `blend-visual.test.js` | بودجهٔ زمانی، سطح قیف، هندسهٔ کیسه‌ها، رنگ میکس |
| `card-art.test.js` | نام خصمانهٔ کالا نمی‌تواند صفتی به تگ `<svg>` اضافه کند |
| `stock.test.js` | مرز دقیق موجودی، پس دادن رزروها در شکست |
| `track.test.js` | یکسان بودن پاسخِ «کد نیست» و «شماره غلط»، فیلدهای نمای عمومی |
| `upload.test.js` | نبودِ SVG در فهرست مجاز، هدرهای `/uploads` |
| `cors.test.js` | خطا در تولیدِ بدون `CLIENT_ORIGIN` |
| `rate-limit.test.js` | خاموش بودن محدودیت در محیط تست |
| `jalali.test.js` | نوروزهای شناخته‌شده، شنبه بودنِ شروع هفته |
| `taxonomy.test.js` | هر کلید shared یک برچسب فارسی دارد — نه کم، نه زیاد |
| `item-routes.test.js` | شکل آدرس کالا و نگاشت دوطرفهٔ نوع ↔ بخش آدرس |
| `json-ld.test.js` | شکل `Product` و `LocalBusiness`، و بی‌خطر بودن متن مدیر داخل `<script>` |
| `sitemap.test.js` | XML نقشهٔ سایت، escape، و بیرون ماندنِ کالای خاموش |
| `next-metadata.test.js` | هر تگی که `headTags` تعریف می‌کند به شیء metadata نکست می‌رسد |
| `next-routes.test.js` | هر نوع کالا پوشهٔ مسیر خودش را دارد — در هر دو جهت |
| `cart-storage.test.js` | سبد ذخیره‌شده بازاعتبارسنجی می‌شود، و حافظهٔ خطادار فروشگاه را زمین نمی‌زند |
| `share.test.js` | نشانیِ فرستاده‌شده همان canonical صفحه است، و دسکتاپ به کپی می‌رود نه به برگهٔ سیستم |
| `toast-store.test.js` | پیام سرِ وقت پاک می‌شود، پیام دوم شمارش تازه می‌گیرد، و snapshot سرور همیشه خالی است |
| `cart-hydration.test.jsx` | سبد از چرخهٔ «رندر سرور ← hydrate» دست‌نخورده بیرون می‌آید |
| `item-card.test.jsx` | کارت هر نوع کالا `<a href>` واقعی به صفحهٔ خودش دارد |
| `item-detail.test.jsx` | مودال کالا بدون `ShopProvider` رندر می‌شود و دکمهٔ هم‌رسانی‌اش کار می‌کند |

### CI

`.github/workflows/ci.yml` روی هر push و هر pull request چهار گام را
همان‌طور اجرا می‌کند که یک نفر روی ماشین خودش می‌زند:

```
npm ci  →  npm run lint  →  npm run format:check  →  npm test  →  npm run build
```

یک `npm ci` برای هر سه workspace کافی است و کش npm روی همان تک
`package-lock.json` ریشه بسته می‌شود. اینجا استقراری در کار نیست — CI فقط
می‌گوید کد سالم است.

پیکربندی ESLint (`eslint.config.mjs`) از نوع flat config است و برای هر
سه بخش قاعدهٔ خودش را دارد؛ `eslint-config-prettier` هم آخر صف می‌نشیند
تا قاعده‌های سلیقه‌ایِ قالب‌بندی با Prettier دعوا نکنند. متن‌های فارسیِ
`*.md` در `.prettierignore` کنار گذاشته شده‌اند، چون تنها کار Prettier با
آن‌ها هم‌تراز کردن ستون‌های جدول است و با پهنای حروف فارسی نتیجه
به‌هم‌ریخته‌تر می‌شود.
