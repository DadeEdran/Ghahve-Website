# ۱۲. واژه‌نامهٔ فنی

## ۱۲.۱ اصطلاحات عمومی توسعهٔ وب

| فارسی | English | توضیح در بستر این پروژه |
|---|---|---|
| پشتهٔ فناوری | Tech stack | MongoDB + Express (API) + Next.js (فروشگاه و پنل) روی Node.js |
| رابط کاربری | User Interface (UI) | پوشهٔ `web/` |
| واسط برنامه‌نویسی | API | ۳۲ مسیر زیر `/api` در `server/src/routes/`، به‌علاوهٔ دو مسیر ریشه |
| نقطهٔ پایانی | Endpoint | مثلاً `POST /api/orders` |
| مسیریابی | Routing | ساختار پوشه‌های `web/src/app` — بدون کتابخانه |
| میان‌افزار | Middleware | `helmet`, `cors`, `express.json`, `requireAdmin`, محدودکننده‌های نرخ |
| مؤلفه / کامپوننت | Component | `ItemCard.jsx`, `CartDrawer.jsx` |
| قلاب | Hook | `useShop`, `useAuth`, `useReveal`, `useStorefrontRefresh` |
| حالت | State | `useState`, Context |
| ویژگی / پراپ | Prop | `<CatalogSection kind="coffee" />` |
| رندر | Render | تولید HTML یا DOM از کامپوننت |
| رندر دوباره | Re-render | اجرای مجدد کامپوننت با تغییر حالت |
| بارگذاری تنبل | Lazy loading | `loading="lazy"` روی تصویرها |
| باندل | Bundle | خروجی `next build` در `web/.next/` |
| ابزار ساخت | Build tool | خودِ Next (پیش‌تر Vite) |
| جایگزینی داغ ماژول | HMR | به‌روزرسانی آنی در توسعه — `'unsafe-eval'` فقط برای همین باز است |
| پراکسی | Proxy | بند `rewrites` در `next.config.mjs` (پیش‌تر `server.proxy` در `vite.config.js`) |
| برنامهٔ تک‌صفحه‌ای | SPA | آنچه **دیگر نیست**؛ هر کالا صفحهٔ خودش را دارد |
| بازگشت SPA | SPA fallback | الگویی که با مورد ۲۶ حذف شد — آدرس ناشناخته حالا ۴۰۴ واقعی است |
| رندر سمت کاربر | CSR | وضعیت پیش از مورد ۲۶؛ امروز فقط تعامل‌ها |
| رندر سمت سرور | SSR | وضعیت فعلی — هر صفحه در هر درخواست روی سرور ساخته می‌شود |
| تولید ایستا | SSG | آنچه عمداً ندارد — بهای nonce (تصمیم ۲۲) |
| بازاعتبارسنجی افزایشی | ISR | `revalidate` — همان، روی میز نیست |
| تفکیک کد | Code splitting | برای JS خودکار (بر اساس مسیر)؛ برای CSS هنوز نه — نیمهٔ باز مورد ۲۰ |
| فضای کاری | Workspace | `shared`, `server`, `web` زیر یک `package-lock.json` |
| بستهٔ مشترک | Shared package | `@ghahve/shared` — `pricing.js`, `taxonomy.js`, `seo.js` |
| تنزل مطبوع | Graceful degradation | `getContent()` که در خطا `{}` می‌دهد |

---

## ۱۲.۲ پایگاه داده و مدل‌سازی

| فارسی | English | توضیح در بستر این پروژه |
|---|---|---|
| مجموعه | Collection | `items`, `orders`, `admins`, `contents`, `clubmembers` |
| سند | Document | یک کالا، یک سفارش |
| زیرسند | Subdocument | `components[]`, `lines[]`, `mix[]` |
| طرح‌واره | Schema | `itemSchema`, `orderSchema` |
| مدل | Model | `Item`, `Order`, `Admin` |
| نگاشتگر شیء–سند | ODM | Mongoose |
| فیلد مجازی | Virtual field | `weighed` — محاسبه می‌شود، ذخیره نمی‌شود |
| قلاب پیش از اعتبارسنجی | `pre('validate')` hook | هشت گروه قاعده در `Item.js` |
| اعتبارسنجی | Validation | `required`, `min`, `max`, `match`, `enum` |
| ایندکس | Index | `{kind:1, rank:1}`, `{code:1}` unique |
| ایندکس یکتا | Unique index | `slug`, `username`, `phone`, `code` |
| ایندکس متنی | Text index | روی `name/origin/spec` — ساخته شده ولی بی‌استفاده |
| تجمیع | Aggregation | `$match`, `$unwind`, `$group`, `$sort` در `stats.js` |
| باز کردن آرایه | `$unwind` | تبدیل هر ردیف سفارش به یک سند مستقل |
| گروه‌بندی | `$group` | جمع فروش هر `slug` |
| فرافکنی | Projection | `{createdAt:1, status:1, totals:1}` در گزارش |
| کوئری سبک | `.lean()` | برگرداندن شیء ساده به‌جای سند Mongoose |
| مکان‌نما | Cursor | استریم کردن خروجی CSV و JSON |
| درج یا به‌روزرسانی | Upsert | `findOneAndUpdate(..., {upsert:true})` در محتوا |
| غیرعادی‌سازی | Denormalization | `Order.totals` که از `lines` قابل محاسبه است |
| عکس لحظه‌ای | Snapshot | `Order.lines[].name/unitPrice/grindLabel` |
| کلید منطقی | Logical key | `slug` — بدون `ObjectId ref` |
| کلید طبیعی | Natural key | `ClubMember.phone` |
| یکپارچگی ارجاعی | Referential integrity | آنچه MongoDB ندارد و `checkBlend` دستی جبران می‌کند |
| مهاجرت | Migration | آنچه با `Mixed` در `Content` از آن فرار شده |
| وراثت تک‌جدولی | Single-table inheritance | یک مدل `Item` با فیلد `kind` |
| حذف نرم | Soft delete | فیلد `active` — کالا پنهان می‌شود نه حذف |
| عملیات اتمی سند | Atomic document update | `findOneAndUpdate` با شرط `$gte` در `stock.js` |
| سه‌حالتی با `null` | Tri-state field | `Item.stock` — نشمرده / مانده / تمام شد |

---

## ۱۲.۳ امنیت

| فارسی | English | توضیح در بستر این پروژه |
|---|---|---|
| احراز هویت | Authentication | ورود مدیر با نام کاربری و رمز |
| اجازه‌سنجی | Authorization | `requireAdmin` روی مسیرهای مدیریتی |
| توکن وب JSON | JWT | `{sub, v}` امضاشده با `JWT_SECRET` |
| بار توکن | Payload | `{ sub: adminId, v: tokenVersion }` |
| توکن حامل | Bearer token | `Authorization: Bearer <token>` |
| هش | Hash | `bcrypt.hash(plain, 12)` |
| ضریب کار | Cost factor / rounds | ۱۲ در `Admin.setPassword` |
| نسخهٔ توکن | Token version | `tokenVersion` — ابطال بدون blacklist |
| ابطال توکن | Token revocation | افزایش `tokenVersion` هنگام تغییر رمز |
| فهرست سفید | Whitelist | `WRITABLE` در `routes/items.js` |
| تخصیص انبوه | Mass assignment | حمله‌ای که `pickBody` می‌بندد |
| شمارش کاربر | User enumeration | پیام یکسان ورود جلویش را می‌گیرد |
| حملهٔ زمانی | Timing attack | `safeEqual` در `lib/track.js` — هش سپس `timingSafeEqual` |
| مقایسهٔ زمان‌ثابت | Constant-time comparison | همان — تا زمانِ پاسخ چیزی لو ندهد |
| تزریق فرمول | CSV / Formula injection | تابع `csvCell` جلویش را می‌گیرد |
| تزریق regex | Regex injection | escape کردن `q` در جست‌وجو |
| منع سرویس با regex | ReDoS | همان escape کردن |
| پیمایش مسیر | Path traversal | نام تصادفی فایل + `path.basename` |
| اسکریپت‌نویسی بین‌سایتی | XSS | `esc()` در `art.js` + بستنِ آپلود SVG |
| بی‌خطرسازی خروجی | Output escaping | `esc()` — پنج نویسه پیش از رفتن داخل SVG |
| جعل درخواست بین‌سایتی | CSRF | با Bearer token خطرش کم است |
| اشتراک منابع بین‌مبدأ | CORS | `resolveCorsOrigin()` — در تولید بدون `CLIENT_ORIGIN` خطای مرگبار |
| محدودیت نرخ | Rate limiting | `loginLimiter`, `orderLimiter`, `trackLimiter` |
| هدرهای امنیتی | Security headers | `helmet` — CSP, HSTS, nosniff, frameguard |
| سیاست امنیت محتوا | CSP | سه سیاست جدا: `proxy.js` برای صفحه‌ها، `helmet` برای API، `upload.js` برای `/uploads` |
| نانس | Nonce | رشتهٔ تصادفیِ هر درخواست در `proxy.js` — به‌جای `'unsafe-inline'` |
| ارثِ پویا | `'strict-dynamic'` | اسکریپتی که اسکریپت دیگری می‌سازد اعتبار nonce را به ارث می‌برد |
| سندبَکس | Sandbox | `default-src 'none'; sandbox` روی `/uploads` |
| منع حدس نوع | `nosniff` | `X-Content-Type-Options` روی فایل‌های آپلودی |
| اعتماد به پراکسی | Trust proxy | شرط درست کار کردن کلید IP در محدودیت نرخ |
| امنیت در عمق | Defense in depth | `select:false` + `toJSON` روی `passwordHash` |
| رمز یک‌بارمصرف | OTP | آنچه ندارد — ضعف ۳۶ |
| نمای عمومی | Public view / projection | `publicOrderView` — whitelist صریح فیلدها |
| نشت وجود | Existence disclosure | همان ۴۰۴ یکسان برای «کد نیست» و «شماره غلط» |

---

## ۱۲.۴ اصطلاحات دامنهٔ قهوه

| فارسی | English | توضیح |
|---|---|---|
| رست / برشته‌کاری | Roast | فرآیند حرارت دادن دانهٔ خام |
| رست‌خانه | Roastery | کارگاه رست — نام فروشگاه |
| درجهٔ رست | Roast level | فیلد `meter` (۱ تا ۵) |
| رست روشن | Light roast | `group: 'light'` — اسیدیتهٔ زنده، میوه و گل |
| رست متوسط | Medium roast | `group: 'medium'` — تعادل شیرینی و اسیدیته |
| رست تیره | Dark roast | `group: 'dark'` — بدنهٔ سنگین، کاکائو |
| بدون کافئین | Decaf | `group: 'decaf'` — کافئین‌زدایی با آب |
| خاستگاه | Origin | فیلد `origin` — کشور و منطقه |
| تک‌خاستگاه | Single origin | قهوهٔ غیرمیکس |
| میکس / ترکیب | Blend | `isBlend: true` |
| میکس ویژهٔ خانه | House blend | `house: true` — بخش جداگانه دارد |
| اجزای میکس | Blend components | `components[]` |
| دستمزد میکس | Blend surcharge | `surcharge` — به ازای هر کیلو |
| فرآوری شسته | Washed process | در فیلد `spec` |
| فرآوری نچرال | Natural process | همان‌جا |
| فرآوری هانی | Honey process | همان‌جا |
| گیلینگ باساه | Wet-hulled | روش سوماترایی |
| مونسونی | Monsooned | روش هندی |
| عربیکا | Arabica | گونهٔ اصلی |
| روبوستا | Robusta | گونهٔ پرکافئین، در میکس‌های اسپرسو |
| کاپینگ | Cupping | چشیدن حرفه‌ای |
| اسیدیته | Acidity | ترشی مطبوع قهوه |
| بدنه | Body | حس غلظت در دهان |
| نوت طعمی | Tasting note | فیلد `notes[]` |
| پروفایل طعمی | Taste profile | فیلد `tastes[]` — هشت کلید |
| کرما | Crema | کف روی اسپرسو |
| آسیاب | Grind | فیلد `grind` — هفت گزینه |
| دانهٔ کامل | Whole bean | `grind: 'whole'` |
| دم‌آوری | Brewing | روش تهیهٔ قهوه |
| دم‌آور دستی | Pour-over | `group: 'pourover'` |
| قیف وی۶۰ | V60 dripper | `shape: 'dripper'` |
| کمکس | Chemex | `shape: 'chemex'` |
| کالیتا ویو | Kalita Wave | `shape: 'wave'` |
| ایروپرس | AeroPress | `shape: 'aeropress'` |
| فرنچ‌پرس | French press | `shape: 'frenchpress'` |
| موکاپات | Moka pot | `shape: 'moka'` |
| جِذوه | Cezve / Ibrik | `shape: 'cezve'` — قهوهٔ ترک |
| سایفون | Siphon | `shape: 'siphon'` |
| دم سرد | Cold brew | میکس `cold-brew` |
| پرتافیلتر | Portafilter | دستهٔ اسپرسوساز |
| گروپ‌هد | Group head | `shape: 'machine'`، `E61` |
| تمپر | Tamper | `shape: 'tamper'` |
| دیستریبیوتر | Distributor / Leveler | `shape: 'leveler'` |
| ابزار WDT | WDT tool | `shape: 'wdt'` |
| پیچر شیر | Milk pitcher | `shape: 'pitcher'` |
| ناک‌باکس | Knock box | `shape: 'knockbox'` |
| کتری گردن‌غازی | Gooseneck kettle | `shape: 'kettle'` |
| تی‌دی‌اس‌متر | Refractometer | `shape: 'refracto'` |
| دمی‌تاس | Demitasse | فنجان اسپرسو |
| لته‌آرت | Latte art | نقش روی فوم شیر |
| ماچا | Matcha | پودر چای سبز ژاپنی |
| هوجیچا | Hojicha | چای سبز برشته |
| ماسالا | Masala chai | چای ادویه‌ای هندی |
| کرک | Karak | چای غلیظ خلیجی |

---

## ۱۲.۵ اصطلاحات کسب‌وکار پروژه

| فارسی | English | توضیح در کد |
|---|---|---|
| سبد خرید | Shopping cart | `ShopContext.cart` |
| ردیف سبد | Cart line | یک شیء با `key`, `slug`, `grams`, `grind`, `mix` |
| شناسهٔ ردیف | Line key | `slug\|grind\|mixSignature` — در `lib/cartLine.js` |
| امضای میکس | Mix signature | تابع `mixSignature` |
| تسویه | Checkout | فرم `step: 'form'` در `CartDrawer` |
| رسید | Receipt | کامپوننت `Receipt` |
| سفارش | Order | مدل `Order` |
| شمارهٔ سفارش | Order code | `P9PT-8412` |
| وضعیت سفارش | Order status | `new`, `processing`, `done`, `canceled` |
| پیگیری سفارش | Order tracking | `/track` — جفتِ «کد + موبایل»، بدون حساب کاربری |
| موجودی انبار | Stock | `Item.stock` — `null` نامحدود، صفر یعنی تمام شد |
| رزرو موجودی | Stock reservation | `reserveStock` با `findOneAndUpdate` اتمی |
| پس دادن رزرو | Stock release | `releaseStock` — در شکست وسط کار |
| فروش بیش از موجودی | Overselling | همان چیزی که رزرو اتمی جلویش را می‌گیرد |
| ناموجود | Sold out | `isSoldOut` — موجودی از کمینهٔ قابل‌خرید کمتر است |
| جمع کالا | Subtotal | `totals.base` |
| تخفیف وزنی | Weight-tier discount | `totals.discount` |
| پلهٔ تخفیف | Discount tier | `TIERS` |
| هزینهٔ ارسال | Shipping | ثابت ۶۵٬۰۰۰ تومان |
| ارسال رایگان | Free shipping | از ۱۰۰۰ گرم |
| مبلغ پرداختی | Total | `totals.total` |
| کالای وزنی | Weighed item | `weighed: true` — قهوه و پودر |
| کالای عددی | Piece item | ابزار |
| پیشنهاد ما | Featured | `featured: true` |
| پیشنهاد روز | Daily pick | `featured[dayIndex() % length]` |
| پرفروش‌ها | Top sellers | `/api/stats/top-sellers` |
| سنجاق‌شده | Pinned | `pinnedTop: true` |
| کنارگذاشته | Excluded | `excludeTop: true` |
| ویترین | Showcase | بخش «ویترین» در فرم کالا |
| حالت تصویری میکس | Visual blend mode | `MixVisual.jsx` — نمای دوم همان ترکیب |
| باشگاه مشتریان | Customer club | مدل `ClubMember` |
| پنل مدیریت | Admin panel | مسیرهای `/admin/*` |
| محتوای سایت | Site content | مدل `Content` — هفت کلید |
| پر کردن اولیه | Seeding | `server/src/seed.js` |
| پشتیبان | Backup | `GET /api/reports/export.json` |

---

## ۱۲.۶ اصطلاحات رابط کاربری و طراحی

| فارسی | English | توضیح در کد |
|---|---|---|
| راست‌به‌چپ | RTL | `dir="rtl"` روی `<html>` |
| ویژگی منطقی | Logical property | `inset-inline-start`, `margin-block-end` |
| دوجهته | Bidirectional (bidi) | چرا `dir="ltr"` روی شماره لازم است |
| توکن طراحی | Design token | متغیرهای CSS در `:root` |
| متغیر CSS | CSS custom property | `--paper`, `--espresso`, `--cherry` |
| نقطهٔ شکست | Breakpoint | `1000px`, `960px`, `760px` |
| واکنش‌گرا | Responsive | `clamp()`, `auto-fill`, `minmax()` |
| کشو | Drawer | `CartDrawer` |
| مودال / پنجرهٔ شناور | Modal | `ItemDetail`, پنجرهٔ گزارش |
| پوشش | Overlay | `.overlay` پشت کشو |
| توست / پیام کوتاه | Toast | `lib/toastStore.js` + `Toast.jsx` — بیرون از هر کانتکست |
| چیپ | Chip | `.chip` — دکمهٔ فیلتر |
| نشان | Badge | `.badge` — برچسب گوشهٔ تصویر |
| برچسب | Tag | فیلد `tag` |
| نوار ابزار | Toolbar | `.toolbar` |
| آکاردئون | Accordion | بخش‌های `AdminContent`، ردیف سفارش |
| پیوند پرش | Skip link | «رفتن به فهرست قهوه‌ها» |
| حلقهٔ فوکوس | Focus ring | `:focus-visible` |
| تلهٔ فوکوس | Focus trap | آنچه ندارد — ضعف ۳۰ |
| تأخیر ورودی | Debounce | ۱۶۰ms جست‌وجو، ۲۵۰ms پنل |
| ناظر تقاطع | IntersectionObserver | `useReveal.js` |
| کاهش حرکت | Reduced motion | `prefers-reduced-motion` |
| گلاس‌مورفیسم | Glassmorphism | `backdrop-filter: blur(12px)` |
| اسکلت بارگذاری | Skeleton | آنچه ندارد (فقط متن «در حال خواندن»، که با SSR عملاً دیده نمی‌شود) |
| پرش یک‌فریمی شمارنده | Hydration flash | شمارندهٔ سبد تا اجرای افکتِ خواندن «۰ گرم» است |

---

## ۱۲.۷ اصطلاحات تقویم و بومی‌سازی

| فارسی | English | توضیح در کد |
|---|---|---|
| تقویم شمسی / جلالی | Jalali / Solar Hijri calendar | `server/src/lib/jalali.js` |
| تقویم میلادی | Gregorian calendar | مبنای ذخیره در `createdAt` |
| شمارهٔ روز ژولین | Julian Day Number (JDN) | پل بین دو تقویم — `g2d`, `d2g` |
| سال کبیسه | Leap year | `jalCal(jy).leap` |
| نقاط شکست | Breaks | آرایهٔ ۱۸ عددی در `jalCal` |
| منطقهٔ زمانی | Timezone | `Asia/Tehran` |
| اختلاف با UTC | UTC offset | ۲۱۰ دقیقه (۳:۳۰) |
| ساعت تابستانی | DST | تا ۱۴۰۱ در ایران |
| بازه / سطل | Bucket | `bucketOf(date, period)` |
| سری زمانی | Time series | `bucketSeries(period, count)` |
| بومی‌سازی | Localization (l10n) | `toLocaleString('fa-IR')` |
| بین‌المللی‌سازی | Internationalization (i18n) | `Intl.DateTimeFormat` |
| رقم فارسی | Persian digits | `۰۱۲۳۴۵۶۷۸۹` (U+06F0–U+06F9) |
| رقم عربی | Arabic-Indic digits | `٠١٢٣٤٥٦٧٨٩` (U+0660–U+0669) |
| جداکنندهٔ هزارگان | Thousands separator | `٬` (U+066C) |
| نیم‌فاصله | ZWNJ | U+200C — در `suggestSlug` هست |
| علامت ترتیب بایت | BOM | `﻿` در ابتدای CSV برای اکسل |

---

## ۱۲.۸ الگوها و اصول

| فارسی | English | جا در پروژه |
|---|---|---|
| منبع یگانهٔ حقیقت | Single source of truth | `shared/` — `pricing.js` و `taxonomy.js` |
| تفکیک دغدغه‌ها | Separation of concerns | `lib/` بدون React و بدون Express |
| بالا بردن حالت | Lifting state up | فیلترها در `HomeShell.jsx` |
| تزریق وابستگی | Dependency injection | `lookup` به `computeTotals` |
| تابع خالص | Pure function | `priceFor`, `applyPercent`, `computeTotals` |
| تغییرناپذیری | Immutability | `setCart((prev) => [...prev, ...])` |
| بازگشت زودهنگام | Early return | `if (!item) return;` |
| اصل شکست امن | Fail-safe default | `blendPricePerKg` که به `item.price` برمی‌گردد |
| اعتبارسنجی دولایه | Client + server validation | `mixError` و بررسی `orders.js` |
| کهنه در حین اعتبارسنجی | Stale-while-revalidate | `openOrder` در `AdminReports` |
| محاسبهٔ خوش‌بینانه | Optimistic calculation | قیمت میکس همان لحظه، بی رفت‌وبرگشت شبکه |
| عملیات اتمی | Atomic operation | شرط و کاهش یکجا در `findOneAndUpdate` |
| شرایط رقابتی | Race condition | دو سفارش هم‌زمان روی آخرین موجودی |
| همه یا هیچ | All-or-nothing | سفارش یا کامل ثبت می‌شود یا اصلاً |
| تزریق مدل برای تست | Model injection | `reserveStock(lines, ItemModel)` |
| تزریق حافظه | Storage injection | `loadCart(storage)` — تا بدون مرورگر تست شود |
| نگهبان ترتیب | Ordering guard | `if (!hydrated) return;` پیش از نوشتن سبد |
| الگوی مؤلفهٔ مرکب | Compound component | `OrderDetail` مشترک بین دو صفحه |
| فرم داده‌محور | Schema-driven form | `contentSchema.js` |
| بذر ثابت | Deterministic seed | `seeded(slug)` در `art.js` |
| بودجهٔ زمانی | Time budget | `POUR_BUDGET` — کل مرحله ثابت، سهم هر کیسه متغیر |
| تنظیم حالت حین رندر | Set state during render | بازنشانی `MixVisual` با تغییر ترکیب |

---

## ۱۲.۹ تست و ابزار توسعه

| فارسی | English | جا در پروژه |
|---|---|---|
| تست واحد | Unit test | بیست‌ودو فایل در `tests/`، ۳۸۰ سنجه |
| تست کامپوننتی | Component test | دو فایل `.jsx` که محیط خود را به jsdom عوض می‌کنند |
| اجراکنندهٔ تست | Test runner | Vitest — `npm test` |
| بدل / جایگزین | Test double / fake | مدل ساختگی در `stock.test.js` و `track.test.js` |
| ادعا | Assertion | `expect(...).toBe(...)` |
| برابری ارجاعی | Reference equality | `toBe` در `taxonomy.test.js` — همان آرایه، نه کپی |
| تست آزمون‌شونده | Meta-test | تستی که خودِ سنجه را می‌سنجد (`card-art.test.js`) |
| تست مرزی | Boundary test | ۹۹۹ در برابر ۱۰۰۰ گرم |
| تست ویژگی‌محور | Property-based test | هزار حرکت تصادفی روی `applyPercent` |
| لینتر | Linter | ESLint با flat config |
| قالب‌بند | Formatter | Prettier — `format:check` گام CI |
| یکپارچه‌سازی پیوسته | CI | `.github/workflows/ci.yml` |
| منطقهٔ زمانی ثابت در تست | Fixed TZ | `env: { TZ: 'Asia/Tehran' }` در `vitest.config.mjs` |
| گرد کردن به مضرب | Round to multiple | `Math.round(x/1000)*1000` |
| نگاه به جلوی منفی | Negative lookahead | `matcher` در `proxy.js` — مسیرهای Express و فایل ایستا را کنار می‌گذارد |
| پخش نوبتی باقیمانده | Round-robin remainder | حلقهٔ توزیع در `applyPercent` |

---

## ۱۲.۱۰ فرمان‌ها و فایل‌های کلیدی

| فرمان | کار |
|---|---|
| `npm run setup` | نصب هر سه workspace + seed |
| `npm run dev` | اجرای همزمان (concurrently) |
| `npm run dev:server` | فقط سرور با `node --watch` |
| `npm run dev:web` | فقط Next روی ۳۰۰۰ |
| `npm run seed` | افزودن چیزهای نبوده |
| `npm run seed:reset` | بازسازی کامل |
| `npm run build` | ساخت `web/.next` |
| `npm start` | اجرای تولید — **دو** فرآیند: Next و Express |
| `npm run docs:pdf` | ساخت `documentation.html` + بازرسی نمودارها + رندر PDF |
| `npm run og:image` | ساخت دوبارهٔ تصویر پیش‌نمایش لینک |
| `npm test` | Vitest، یک بار |
| `npm run test:watch` | Vitest در حالت پیوسته |
| `npm run lint` | ESLint روی هر سه workspace |
| `npm run format` | Prettier، با نوشتن |
| `npm run format:check` | همان، فقط بررسی — گام CI |
| `net start MongoDB` | روشن کردن سرویس (ویندوز، با دسترسی مدیر) |

| فایل | چیست |
|---|---|
| `server/.env` | تنظیمات محرمانه (در git نیست) |
| `server/.env.example` | نمونهٔ قابل انتشار |
| `shared/pricing.js` | تنها نسخهٔ محاسبهٔ قیمت — هر دو طرف |
| `shared/taxonomy.js` | تنها نسخهٔ کلیدهای مجاز — هر دو طرف |
| `shared/seo.js` | آدرس کالا، متن `<head>`، JSON-LD، sitemap و robots |
| `web/next.config.mjs` | پراکسی به Express + `transpilePackages` |
| `web/src/proxy.js` | سیاست امنیتی صفحه‌ها — CSP با nonce |
| `web/src/app/layout.jsx` | پوستهٔ همه‌جا، شکاف مودال، و `force-dynamic` |
| `web/src/lib/data.js` | خواندن داده روی سرور، با `cache` ری‌اکت |
| `web/src/lib/metadata.js` | از توصیفِ `<head>` به شیء metadata نکست |
| `web/src/lib/cartStorage.js` | خواندن و نوشتن سبد، با حافظهٔ تزریق‌شده |
| `web/src/lib/groups.js` | برچسب فارسیِ همان کلیدها |
| `web/src/lib/art.js` | تولید SVG تصویر کارت‌ها + `esc` |
| `web/src/lib/cartLine.js` | شکل ردیف سبد — مشترک بین دو حالت میکس |
| `web/src/lib/blendVisual.js` | زمان‌بندی و هندسهٔ حالت تصویری |
| `server/src/lib/stock.js` | رزرو و پس‌دادن اتمی موجودی |
| `server/src/lib/track.js` | پیگیری سفارش و نمای عمومی |
| `server/src/lib/cors.js` | تصمیم CORS، جدا و تست‌پذیر |
| `server/src/middleware/rateLimit.js` | سه محدودکنندهٔ نرخ |
| `web/src/components/admin/contentSchema.js` | توصیف فرم محتوا |
| `vitest.config.mjs` · `eslint.config.mjs` | پیکربندی تست و لینت |
| `.github/workflows/ci.yml` | نصب · لینت · قالب‌بندی · تست · build |

---

## ۱۲.۱۱ اصطلاحات معماری Next (App Router)

همهٔ این‌ها با مورد ۲۶ وارد پروژه شدند. ستون آخر می‌گوید در **کدام فایل**
می‌شود نمونه‌اش را دید.

| فارسی | English | در این پروژه |
|---|---|---|
| مسیریاب اپ | App Router | `web/src/app/` — ساختار پوشه‌ها همان جدول مسیرهاست |
| کامپوننت سروری | Server Component | پیش‌فرض همه‌جا: `app/page.jsx`, `_item/itemRoute.jsx`, `ItemBody.jsx` |
| کامپوننت مشتری | Client Component | با `'use client'` بالای فایل: `HomeShell`, `ShopContext`, `AdminShell` |
| مرز سرور–مشتری | Server/client boundary | تابع از آن رد نمی‌شود؛ فقط دادهٔ قابل‌سریال‌سازی — دلیل وجود `SiteHeader.jsx` |
| آبدهی / آب‌بندی | Hydration | زنده شدن HTML سروری در مرورگر — سه نگهبانش در ۷.۱۲ |
| ناسازگاری آبدهی | Hydration mismatch | چیزی که سبدِ خالیِ اولیه عمداً از آن جلوگیری می‌کند |
| پارامتر مسیر | Dynamic segment | `[slug]` در `app/coffee/[slug]/` |
| گروه مسیر | Route group | `(panel)` — در آدرس دیده نمی‌شود، فقط برای layout مشترک |
| پوشهٔ خصوصی | Private folder | `_item/` — با `_` شروع می‌شود، پس Next مسیر حسابش نمی‌کند |
| مسیر موازی | Parallel route | `@modal` — شکاف دومِ `app/layout.jsx` |
| مسیر رهگیری‌شده | Intercepting route | `(.)coffee/[slug]` — پیمایش نرم مودال، بازدید سرد صفحهٔ کامل |
| پیش‌فرض شکاف | Slot default | `@modal/default.jsx` که `null` می‌دهد — بی آن، بازدید سرد ۴۰۴ می‌شود |
| پوسته / چیدمان | Layout | `app/layout.jsx`, `app/admin/layout.jsx`, `(panel)/layout.jsx` |
| صفحهٔ نیافته | `not-found.jsx` | ۴۰۴ عمومی، و ۴۰۴ اختصاصی هر نوع کالا |
| مرز خطا | `error.jsx` | وقتی سرور نتوانست صفحه را بسازد (۵۰۰، نه ۴۰۴) |
| رندر پویای اجباری | `force-dynamic` | بهای nonce — هیچ صفحه‌ای از پیش ساخته نمی‌شود |
| API متادیتا | Metadata API | `export const metadata` و `generateMetadata` |
| متادیتای پویا | `generateMetadata` | `itemMetadata(segment, props)` در `_item/itemRoute.jsx` |
| پایهٔ متادیتا | `metadataBase` | در `lib/site.js` — تا آدرس نسبیِ `og:image` مطلق شود |
| بازنویسی مسیر | Rewrite | بند `rewrites` در `next.config.mjs` |
| میان‌افزار | Middleware | `web/src/proxy.js` — نامش در Next ۱۶ به `proxy` عوض شد |
| کش درخواست ری‌اکت | `cache()` | در `lib/data.js` — یک کالا در یک درخواست، یک بار خوانده می‌شود |
| بدون ذخیرهٔ کش | `cache: 'no-store'` | چون فهرست کالاها و موجودی زنده‌اند |
| کش مسیریاب | Router cache | همان چیزی که `router.refresh()` باطلش می‌کند |
| تازه‌سازی مسیریاب | `router.refresh()` | `useStorefrontRefresh()` — جانشین `reload()` در پنل |
| فونت خودمیزبان | Self-hosted font | `next/font` — فایل‌ها موقع build گرفته می‌شوند |
| متغیر فونت | Font CSS variable | `--font-vazirmatn` و `--font-lalezar` روی `<html>` |
| بستهٔ ترنسپایل‌شونده | `transpilePackages` | برای `@ghahve/shared` که ترنسپایل‌نشده است |
| ریشهٔ ردیابی فایل | `outputFileTracingRoot` | چون `node_modules` در ریشهٔ workspace هویست می‌شود |

### چهار چیز که نامشان شبیه است ولی یکی نیستند

| | چیست | مثال |
|---|---|---|
| `proxy.js` | میان‌افزار Next که هدر امنیتی می‌گذارد | `web/src/proxy.js` |
| `rewrites` | فرستادن درخواست به Express | `next.config.mjs` |
| `lib/api.js` | fetch از **مرورگر**، با مسیر نسبی | `request('/api/items')` |
| `lib/data.js` | fetch از **سرور**، با آدرس مطلق | ``fetch(`${API_URL}/api/items`)`` |
