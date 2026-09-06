# یادداشت‌های تحلیل — پروژهٔ رُست‌خانهٔ دانه
*(حافظهٔ کاری؛ همهٔ ارجاع‌ها به فایل‌های واقعی مخزن)*

> **این فایل عکسِ یک لحظه است، نه سند زنده.** یادداشت‌های خواندنِ اولیهٔ
> کد است و عمداً به‌روز نمی‌شود — ارزشش در همین است که نشان می‌دهد پروژه
> در آن نقطه چه شکلی بود.
>
> پس اگر به `client/` یا بازگشتِ SPA یا فونتِ گوگل اشاره‌ای دیدید، اشاره
> به گذشته است: کلاینت با مورد ۲۶ به Next.js منتقل و پوشهٔ `client/`
> حذف شد. همین‌طور `index.html` و `script.js` و `style.css` ریشه — نسخهٔ
> ایستای اولیه — دیگر در مخزن نیستند و فقط پوشهٔ `img/` از آن‌ها مانده
> (مورد ۱۸). وضعیت امروز در فصل‌های ۳ و ۵ و ۱۱ است.

---

## ۱) فهرست فایل‌ها و مسئولیت هرکدام

### ریشه

| فایل | خط | مسئولیت |
|---|---|---|
| `package.json` | ۳۲ | فقط اسکریپت — هیچ وابستگی تولیدی ندارد. `concurrently` تنها devDependency. اسکریپت‌ها: `setup`, `seed`, `seed:reset`, `dev`, `dev:server`, `dev:client`, `build`, `start` |
| `README.md` | ۴۳۰+ | راهنمای راه‌اندازی به فارسی |
| `.gitignore` | ۱۵ | `node_modules/`, `dist/`, `.env`, `server/.env`, `server/uploads/*` با استثنای `.gitkeep` |
| `index.html` (۲۷ KB) | — | **نسخهٔ اولیهٔ ایستا** — کل صفحهٔ فروشگاه به‌صورت HTML دستی |
| `script.js` (۱۲۱ KB) | — | **نسخهٔ اولیهٔ ایستا** — همان GROUPS/GEAR_GROUPS/آرت/قیمت‌گذاری ولی با آرایهٔ داخل فایل |
| `style.css` (۲۹ KB) | — | **نسخهٔ اولیهٔ ایستا** |
| `img/` | ۱۱ SVG | تصویرهای ثابت — نسخهٔ ریشه (کپی در `web/public/img/`) |

> این سه فایل ریشه **اجرا نمی‌شوند**. مبنای بازنویسی MERN بوده‌اند و
> کامنت‌های `web/src/lib/*.js` مدام به «نسخهٔ اولیهٔ سایت» ارجاع می‌دهند.

### `server/src/`

| فایل | خط | مسئولیت |
|---|---|---|
| `index.js` | ۹۳ | ساخت اپ Express؛ `cors` با `CLIENT_ORIGIN?.split(',') \|\| true`؛ `express.json({limit:'1mb'})`؛ `/uploads` استاتیک با `maxAge:'7d'`؛ هفت روتر؛ سرو `client/dist` با regex `^(?!\/api\|\/uploads).*` برای SPA fallback؛ ۴۰۴ فارسی؛ **مبدل خطای سراسری** (ValidationError→۴۰۰ با پیام mongoose، `11000`→۴۰۰ با نام فیلد فارسی، CastError→۴۰۰)؛ راهنمای `EADDRINUSE` با دستور PowerShell |
| `db.js` | ۴۰ | `connectDB()` با `serverSelectionTimeoutMS: 8000`، `strictQuery: true`، لاگ `disconnected`/`reconnected`. پیام‌ها انگلیسی (کنسول ویندوز) |
| `seed.js` | ۱۸۵ | `seedItems` → `enrichExisting` → `seedBlends` → `seedContent` → `seedAdmin`. بدون `--reset` فقط چیزهای نبوده را اضافه می‌کند |
| `middleware/auth.js` | ۴۰ | `signToken(admin)` با payload `{sub, v}` و `expiresIn: ${TOKEN_HOURS}h`؛ `requireAdmin` که علاوه بر امضا، `tokenVersion` را هم چک می‌کند |
| `lib/pricing.js` | ۱۰۲ | **مرجع محاسبهٔ قیمت** (جزئیات بخش ۴) |
| `lib/jalali.js` | ۲۷۴ | تقویم شمسی دست‌نویس + بازه‌بندی گزارش (جزئیات بخش ۴) |
| `lib/upload.js` | ۴۱ | multer diskStorage؛ نام = `crypto.randomBytes(12).toString('hex') + ext`؛ سقف ۴ MB؛ whitelist شش MIME |
| `models/Item.js` | ۲۱۱ | مدل واحد سه‌نوعه (جزئیات بخش ۳) |
| `models/Order.js` | ۸۹ | سفارش + `lineSchema` + `mixSchema`؛ تولید `code` در `pre('validate')` |
| `models/Admin.js` | ۴۵ | `passwordHash` با `select:false`؛ `setPassword` (bcrypt cost 12)؛ `checkPassword`؛ `tokenVersion` |
| `models/ClubMember.js` | ۵۳ | نام/موبایل یکتا/ایمیل اختیاری/سلیقه؛ `index({createdAt:-1})` |
| `models/Content.js` | ۴۰ | `{key, data:Mixed}`، `minimize:false`؛ تابع `loadContent()` |
| `routes/auth.js` | ۸۹ | `POST /login`، `GET /me`، `POST /change-password` |
| `routes/items.js` | ۲۳۱ | `pickBody` (whitelist)، `checkBlend`، `removeImageFile`، هفت endpoint |
| `routes/orders.js` | ۲۳۵ | **مهم‌ترین مسیر** — بازمحاسبهٔ کامل قیمت (بخش ۵) |
| `routes/content.js` | ۷۲ | GET همه با fallback، PUT یک بخش، POST reset |
| `routes/club.js` | ۱۰۰ | عضویت upsert-وار، فهرست، حذف، `export.csv` با BOM |
| `routes/stats.js` | ۸۰ | `top-sellers` (aggregate روی سفارش‌ها)، `featured` |
| `routes/reports.js` | ۳۸۵ | `summary`، `orders`، `export.csv`، `export.json` — دو تای آخر استریمی با cursor |
| `data/taxonomy.js` | ۶۶ | کلیدهای مجاز؛ منبع اعتبارسنجی مدل |
| `data/default-content.js` | ۲۳۲ | متن اولیهٔ هفت بخش سایت |
| `data/seed-items.js` | ۱۱۷ | ۱۰۶ کالا به‌صورت JSON یک‌خطی |
| `data/seed-enrich.js` | ۵۲۷ | `TASTE_TAGS` (۳۲ قهوه)، `STORIES` (متن معرفی)، `BLENDS` (۵ میکس) |

### `client/src/`

| فایل | خط | مسئولیت |
|---|---|---|
| `main.jsx` | ۱۶ | `createRoot` + `StrictMode` + `BrowserRouter` با پرچم‌های `v7_startTransition` و `v7_relativeSplatPath` |
| `App.jsx` | ۴۲ | `AuthProvider > ShopProvider > Routes`؛ ۱۰ مسیر؛ `*` → `/` |
| `context/ShopContext.jsx` | ۳۰۷ | قلب فروشگاه (بخش ۷) |
| `context/AuthContext.jsx` | ۶۱ | `admin`, `checking`, `login`, `logout`, `refreshSession`؛ ثبت `setUnauthorizedHandler` |
| `lib/api.js` | ۱۷۰ | `request()` یکتا + ۳۰ متد + `download()` برای فایل‌های محافظت‌شده |
| `lib/pricing.js` | ۱۰۱ | آینهٔ نسخهٔ سرور |
| `lib/blend.js` | ۹۸ | `startingMix`, `sumOf`, `applyPercent`, `addBean`, `removeBean`, `mixError` |
| `lib/groups.js` | ۱۷۴ | `GROUPS`, `GEAR_GROUPS`, `POWDER_GROUPS`, `KINDS`, `ORDER_STATUS`, `DEFAULT_GRINDS`, `TASTES`, `GEAR_SHAPES/MATERIALS`, `POWDER_SHAPES/TONES` |
| `lib/format.js` | ۳۲ | `toFa` (`toLocaleString('fa-IR')`)، `money`، `formatWeight`، `toLatinDigits`، `faDate` (`Intl.DateTimeFormat('fa-IR')`) |
| `lib/art.js` | ۸۴۶ | `productArt`, `gearArt`, `powderArt` + جدول‌های رنگ + ۳۶ شکل ابزار + ۱۴ شکل پودر |
| `lib/useReveal.js` | ۲۷ | IntersectionObserver با `threshold: .12` و تأخیر پلکانی `i*55ms`؛ احترام به `prefers-reduced-motion` |
| `components/Header.jsx` | ۶۲ | لوگوی SVG، ۱۰ لینک لنگری، دکمهٔ سبد با خلاصهٔ کوتاه، برگر |
| `components/Hero.jsx` | ۱۱۲ | «ترازوی قیمت» — انتخاب قهوه + اسلایدر ۱۰۰..۲۰۰۰ گرم با گام ۵۰ |
| `components/CatalogSection.jsx` | ۱۷۶ | یک کامپوننت برای هر سه فهرست؛ فیلتر/جست‌وجوی debounce ۱۶۰ms/شش ترتیب/گروه‌بندی شرطی |
| `components/ItemCard.jsx` | ۱۵۹ | کارت واحد سه‌نوعه |
| `components/ItemDetail.jsx` | ۱۲۵ | مودال «دربارهٔ این قهوه» + `hasStory()` |
| `components/CartDrawer.jsx` | ۴۰۷ | سه حالت: سبد / فرم / رسید + کامپوننت `Receipt` |
| `components/BlendsSection.jsx` | ۲۳۵ | `BlendCard` با اهرم‌ها |
| `components/CardArt.jsx` | ۳۶ | `artSVG()` + انتخاب بین عکس آپلودی و SVG تولیدی |
| `components/ContentSections.jsx` | ۴۷۵ | `WhyUsSection`, `SuggestSection`, `PicksSections`, `ClubSection`, `AboutSection` + `CardGrid` + جدول `ICONS` |
| `components/StaticSections.jsx` | ۳۳۵ | `Strip`, `BrewSection`, `StorySection`, `BulkSection`, `GuideSection`, `CafeSection`, `Footer` |
| `pages/Home.jsx` | ۱۳۲ | ترتیب بخش‌ها + سه state فیلتر + رفع باگ لنگر |
| `pages/admin/*` | ~۲۳۰۰ | هشت صفحه + `contentSchema.js` |
| `style.css` | ۹۳۸ | استایل فروشگاه |
| `admin.css` | ۷۲۲ | استایل پنل + رسید + `@media print` |

---

## ۲) نقشهٔ وابستگی ماژول‌ها

```
main.jsx → App.jsx → AuthProvider → ShopProvider → Routes
                                       │
       ┌───────────────────────────────┴──────────────────────┐
       ▼                                                      ▼
   Home.jsx                                              admin/AdminLayout
       ├─ Header ──────► useShop().cartSummary                   ├─ AdminItems ─┐
       ├─ Hero ────────► useShop().byKind, addWeighed            ├─ AdminItemForm├─► api.js
       ├─ CatalogSection ──► ItemCard ──► CardArt ──► art.js     ├─ AdminOrders │
       ├─ BlendsSection ──► blend.js + pricing.js                ├─ AdminReports│
       ├─ ContentSections ─► api.featured/topSellers             ├─ AdminContent│
       ├─ StaticSections                                         ├─ AdminClub   │
       └─ CartDrawer ──► api.placeOrder                          └─ AdminSettings┘
```

نکته‌ها:
- `ShopContext` تنها جایی است که `api.items()` و `api.content()` را صدا می‌زند.
- `PicksSections` مستقیماً `api.featured` و `api.topSellers` می‌زند (نه از context)
  و به `items` وابسته است تا با هر reload دوباره بخواند.
- `AdminItems`, `AdminItemForm`, `AdminContent` بعد از هر تغییر `reloadShop()` می‌زنند
  تا فروشگاه در همان تب به‌روز شود.
- `OrderDetail.jsx` هم در `AdminOrders` و هم در مودال `AdminReports` استفاده می‌شود.
- `pricing.js` هم در `ShopContext`، هم `ItemCard`، هم `CartDrawer`، هم `Hero`،
  هم `BlendsSection` استفاده می‌شود.

---

## ۳) مدل داده

### Item (`server/src/models/Item.js`) — مجموعهٔ `items`

| فیلد | نوع | پیش‌فرض | قید |
|---|---|---|---|
| `kind` | String | — | required, `enum: ['coffee','gear','powder']`, index |
| `slug` | String | — | required, unique, lowercase, trim, `/^[a-z0-9][a-z0-9-]*$/` |
| `name` | String | — | required, trim |
| `origin` | String | `''` | trim |
| `spec` | String | `''` | trim |
| `group` | String | — | required, index، باید در `GROUPS_BY_KIND[kind]` باشد |
| `meter` | Number | `3` | ۱..۵ |
| `price` | Number | — | required, ≥۰ — قهوه/پودر «هر کیلو»، ابزار «هر عدد» |
| `notes` | [String] | `[]` | ویژگی‌های کوتاه روی کارت |
| `pairs` | [String] | `[]` | «سازگار با» (ابزار) / «پیشنهاد سرو» (پودر) |
| `tag` | String | `''` | برچسب گوشهٔ تصویر |
| `shape` | String | `''` | ابزار/پودر — کلید در `art.js` |
| `mat` | String | `''` | جنس ابزار — کلید در `MATERIAL` |
| `tone` | String | `''` | رنگ پودر — کلید در `POWDER_TONE` |
| `zoom` | Number | `1` | ۰٫۴..۲ — بزرگ‌نمایی طرح |
| `image` | String | `''` | اگر پر باشد، جای SVG می‌نشیند |
| `rank` | Number | `999` | ترتیب «پیشنهاد ما» |
| `active` | Boolean | `true` | خاموش = در `/api/items` نمی‌آید |
| `story` / `taste` / `recommend` | String | `''` | سه بلوک مودال معرفی |
| `tastes` | [String] | `[]` | زیرمجموعهٔ `TASTE_KEYS` (validator) |
| `isBlend` | Boolean | `false` | |
| `house` | Boolean | `false` | در بخش «میکس‌های ویژه» بیاید |
| `customizable` | Boolean | `false` | مشتری درصدها را عوض کند |
| `components` | [componentSchema] | `[]` | `{slug, percent, min, max, locked}` بدون `_id` |
| `pool` | [String] | `[]` | دانه‌های پیشنهادی برای افزودن |
| `surcharge` | Number | `0` | دستمزد میکس، هر کیلو |
| `featured` | Boolean | `false` | ویترین «پیشنهاد ما» |
| `pinnedTop` | Boolean | `false` | همیشه در پرفروش‌ها |
| `excludeTop` | Boolean | `false` | هیچ‌وقت در پرفروش‌ها |
| `grindable` | Boolean | `false` | خودکار: فقط `coffee` |
| `createdAt`/`updatedAt` | Date | timestamps | |

**virtual:** `weighed` = `IS_WEIGHED[kind] === true` (قهوه و پودر true).
**toJSON:** `virtuals: true`، حذف `__v`.
**index:** `{kind:1, rank:1}` و text-index روی `name/origin/spec`.

**hook `pre('validate')` — هفت قاعده:**
1. `group` باید عضو `GROUPS_BY_KIND[kind]` باشد وگرنه `invalidate`.
2. `gear`: `shape` پیش‌فرض `mug`، `mat` پیش‌فرض `steel`، هر دو باید در whitelist باشند، `tone=''`.
3. `powder`: `shape` پیش‌فرض `scoop`، `tone` پیش‌فرض `cocoa`، `mat=''`.
4. `coffee`: `shape/mat/tone=''`، `pairs=[]`، `grindable=true`.
5. غیرقهوه: `grindable=false` و همهٔ فیلدهای میکس پاک می‌شوند.
6. اگر `isBlend`: حداقل دو جزء؛ `|Σpercent − 100| ≤ 1`؛ بدون slug تکراری؛ `min ≤ max`.
7. اگر `!isBlend`: `components/pool` پاک، `customizable/house=false`، `surcharge=0`.
   در پایان `price` و `meter` گرد می‌شوند.

### Order (`server/src/models/Order.js`) — مجموعهٔ `orders`

- `code` String unique index — در `pre('validate')` ساخته می‌شود:
  `Date.now().toString(36).slice(-4).toUpperCase() + '-' + rand(1000..9999)`
- `lines: [lineSchema]` با validator `v.length > 0`
  - `lineSchema`: `kind`, `slug`, `name`, `unitPrice`, `grams`(۰), `qty`(۰),
    `lineTotal`, `grind`, `grindLabel`, `mix: [mixSchema]` — همه بدون `_id`
  - `mixSchema`: `{slug, name, percent}` — **نام دانه هم ذخیره می‌شود** تا فاکتور
    بعد از تغییر نام کالا هم خوانا بماند
- `customer`: `name`/`phone`/`address` required + `note` اختیاری
- `totals`: `grams`, `pieces`, `base`, `discount`, `discountLabel`, `shipping`, `total`
- `status`: enum `['new','processing','done','canceled']`, default `new`, index

### Admin — مجموعهٔ `admins`
`username` (unique, lowercase, min 3) · `passwordHash` (`select:false`) · `tokenVersion` (Number, 0)
متدها: `setPassword` (bcrypt cost **12**) · `checkPassword`. `toJSON` هش را حذف می‌کند.

### ClubMember — مجموعهٔ `clubmembers`
`name` (2..80) · `phone` unique با `/^0\d{10}$/` · `email` اختیاری با regex · `taste` · `note` (max 400) · `active`

### Content — مجموعهٔ `contents`
`{key: unique String, data: Mixed}` با `minimize:false`.
هفت کلید: `whyUs`, `suggest`, `picks`, `blends`, `club`, `about`, `grinds`.

### رابطه‌ها
هیچ `ObjectId ref` در پروژه نیست. تنها پیوند، **`slug` به‌عنوان کلید منطقی** است:

```
Item.slug ──┬──► Item.components[].slug   (میکس → دانه)
            ├──► Item.pool[]              (میکس → دانه‌های پیشنهادی)
            ├──► Order.lines[].slug       (عکس لحظه‌ای؛ رابطهٔ سست)
            ├──► Order.lines[].mix[].slug
            └──► Content.suggest.profiles[].picks[]
```

سفارش‌ها **snapshot** ذخیره می‌شوند: `name`, `unitPrice`, `lineTotal`, `grindLabel`
و نام دانه‌های میکس همه در خود سفارش‌اند، پس حذف یا گران شدن کالا فاکتور قدیمی را دست نمی‌زند.

### پایگاه دادهٔ اولیه
۱۰۶ کالا: ۳۲ قهوه (light 8، medium 11، dark 4، espresso 5، decaf 2 — طبق `group`)،
۴۰ ابزار، ۳۴ پودر. پنج میکس در `BLENDS`:
`espresso-70-30` (surcharge 40k) · `espresso-100` (50k) · `espresso-50-50` (35k) ·
`shabneshin` (45k) · `cold-brew` (40k). هر پنج `house` و `customizable`.

---

## ۴) الگوریتم‌ها و قواعد تجاری

### الف) قیمت‌گذاری — `lib/pricing.js` (هر دو نسخه یکسان)

```js
TIERS = [{min:5000,rate:.15,label:'۱۵٪'},{min:3000,rate:.10,label:'۱۰٪'},
         {min:1000,rate:.05,label:'۵٪'},{min:0,rate:0,label:''}]
SHIPPING = 65000            // تومان
FREE_SHIPPING_FROM = 1000   // گرم

priceFor(pricePerKg, grams) = round(pricePerKg*grams/1000 /1000)*1000
```
یعنی «قیمت هر کیلو × وزن ÷ ۱۰۰۰» و بعد گرد به نزدیک‌ترین ۱۰۰۰ تومان.

```js
blendPricePerKg(item, mix, lookup):
  parts = mix?.length ? mix : item.components
  if !parts.length → item.price
  Σ(bean.price × percent) / Σ(percent)      // میانگین وزنی
  اگر دانه‌ای پیدا نشد → item.price          // fallback امن
  اگر Σpercent ≤ 0 → item.price
  نتیجه = round((weighted + surcharge)/1000)*1000
```
تقسیم بر `Σpercent` (نه بر ۱۰۰) یعنی اگر مجموع ۹۹ یا ۱۰۱ شد هم عدد معنی‌دار می‌ماند.

```js
computeTotals(lines, lookup):
  gear   → pieces += qty ; gearBase += price*qty
  weighed→ grams += grams ; weighedBase += priceFor(unitPriceFor(l), grams)
  base     = weighedBase + gearBase
  tier     = TIERS.find(t => grams >= t.min)      // آرایه نزولی مرتب است
  discount = round(weighedBase * tier.rate /1000)*1000   // فقط روی وزنی‌ها
  shipping = lines.length===0 ? 0 : grams>=1000 ? 0 : 65000
  total    = base − discount + shipping
```

سه نکتهٔ ظریف:
- تخفیف روی `weighedBase` است نه `base` — پس ابزار تخفیف نمی‌گیرد ولی
  آستانه هم بر پایهٔ وزن است، نه پول.
- `TIERS` نزولی مرتب شده تا `.find()` اولین تطبیق را بدهد؛ ردیف `min:0` نقش
  «else» را بازی می‌کند و هرگز `undefined` برنمی‌گردد.
- ارسال رایگان با **وزن** فعال می‌شود، نه با مبلغ — سبدی که فقط ابزار دارد
  همیشه ۶۵٬۰۰۰ تومان ارسال می‌دهد.

### ب) ریاضی میکس — `web/src/lib/blend.js`

`applyPercent(parts, slug, raw)`:
1. `want = clamp(round(raw), 0, 100)`؛ `delta = want − self.percent`.
2. **جای خالی** هر دانهٔ دیگر: اگر `delta>0` (این دانه بزرگ می‌شود)
   `room = p.percent` (چقدر می‌تواند کم شود)؛ اگر `delta<0`، `room = 100 − p.percent`.
3. `need = min(|delta|, totalRoom)` — یعنی اگر جا نبود، حرکت کوتاه می‌شود.
4. سهم هر دانه = `floor(need * room / totalRoom)`.
5. باقیماندهٔ گِردکردن یکی‌یکی round-robin پخش می‌شود
   (حلقهٔ محافظت‌شده با `i < shares.length*200`).
6. نتیجه: مجموع **همیشه دقیقاً ۱۰۰** می‌ماند.

`addBean(parts, slug, share=20)` → دانه با ۰٪ اضافه، بعد `applyPercent` تا ۲۰٪.
`removeBean(parts, slug)` → اگر `length <= 2` بی‌اثر؛ وگرنه صفر و حذف.
`mixError(parts)` → «حداقل دو دانهٔ فعال» و «`|Σ−100| ≤ 1`» — **همان دو قاعده‌ای
که سرور هم در `routes/orders.js` بررسی می‌کند**.

### ج) تقویم شمسی — `server/src/lib/jalali.js`

- الگوریتم `jalaali` استاندارد: `jalCal(jy)` با آرایهٔ ۱۸ نقطهٔ شکست
  (`-61, 9, 38, … 3628`)، `g2d`/`d2g` برای شمارهٔ روز ژولین، `d2jInternal`.
- **منطقهٔ زمانی:** به‌جای offset ثابت، `offsetMinAt(date)` اختلاف واقعی همان
  لحظه را از `Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran'})` می‌گیرد —
  چون ایران تا ۱۴۰۱ ساعت تابستانی داشت (۲۱۰ یا ۲۷۰ دقیقه).
- `tehranMidnight` دو بار تصحیح می‌کند تا روی مرز DST هم درست بنشیند.
- `bucketOf(date, period)`: `day`/`week`/`month`/`year`. **هفته از شنبه**:
  `back = (weekday + 1) % 7` که با `getUTCDay` (۰=یکشنبه) فاصلهٔ تا شنبهٔ قبل را می‌دهد.
- `makeBucket` برچسب فارسی می‌سازد: روز → «۲۰ مرداد ۱۴۰۵»؛ هفته → «۱۴ تا ۲۰ مرداد ۱۴۰۵»
  یا اگر ماه عوض شود شکل بلندتر؛ ماه → «مرداد ۱۴۰۵»؛ سال → «سال ۱۴۰۵».
- `bucketSeries(period, count)` با `unshift` از حال به گذشته می‌رود و **بازه‌های
  خالی را هم نگه می‌دارد** تا نمودار حفره نداشته باشد.
- `jalaliDateString` عمداً **رقم لاتین** می‌دهد (برای اکسل)؛ برچسب‌ها رقم فارسی.

### د) قالب‌بندی عدد — `web/src/lib/format.js`
- `toFa` = `Number(n).toLocaleString('fa-IR')` → جداکنندهٔ هزارگان + رقم فارسی.
- `formatWeight`: زیر ۱۰۰۰ «گرم»؛ بالاتر تقسیم بر ۱۰۰۰ و اگر صحیح نبود `toFixed(2)`.
- `toLatinDigits`: `[۰-۹]` و `[٠-٩]` → لاتین + حذف `,` — تا مدیر با کیبورد فارسی
  قیمت بنویسد.
- `faDate` = `Intl.DateTimeFormat('fa-IR', {...})` — تقویم شمسی مرورگر.

### ه) پرفروش‌ها — `routes/stats.js`
```
aggregate: match(status ≠ canceled) → unwind lines → group by slug
           { orders: $sum 1, grams, qty, revenue } → sort(orders↓, revenue↓) → limit 60
سپس در JS: items(active, excludeTop≠true) را با فروش join می‌کند
filter(pinnedTop || sales) → sort(pinnedTop اول، orders↓، rank↑) → slice(limit)
```
«تعداد دفعات سفارش» (`$sum: 1`) ملاک است چون واحد وزنی و عددی قابل جمع نیستند.

### و) تولید تصویر — `web/src/lib/art.js`
- `seeded(str)`: هش FNV-1a سپس xorshift → عدد شبه‌تصادفی **قطعی بر پایهٔ slug**.
  پس طرح هر کالا همیشه یکسان است.
- `productArt(p)`: پس‌زمینه از `GROUP_SCENE[group]`، رنگ دانه از `ROAST_TONE[meter]`،
  هفت دانه روی `spots` ثابت با چرخش/مقیاس/جابه‌جایی تصادفیِ بذردار،
  `motifFor(group)` نقش‌مایه، دو دایرهٔ محو، گرادیان براقی روی همه.
- `gearArt(it)`: رنگ از `MATERIAL[mat]`، طرح از `SHAPES[shape]` (۳۶ شکل)،
  `zoom` روی `<g transform="translate(140 76) scale(z)">`، سایهٔ بیضی زیر ابزار.
- `powderArt(p)`: `heap()` تپهٔ پودر + `POWDER_SHAPES[shape]` (۱۴ شکل) + `POWDER_TONE[tone]`.
- `uid` از slug ساخته می‌شود تا `id` گرادیان‌ها بین کارت‌ها تداخل نکند.
- `CardArt` خروجی را با `dangerouslySetInnerHTML` تزریق می‌کند؛ `artSVG` داخل
  `try/catch` است تا طرح ناقص کل صفحه را نیندازد.

### ز) اعتبارسنجی شماره تلفن
سه جا و هر سه با همان regex `/^0\d{10}$/` بعد از `toLatinDigits`:
`CartDrawer.submit`، `ClubSection.submit`، `routes/club.js`.
مدل `ClubMember` هم همان regex را در `match` دارد.

### ح) پیشنهاد روز
`ContentSections.dayIndex() = floor(Date.now()/86400000)` سپس
`featured[dayIndex % featured.length]` — در طول یک روز ثابت، هر روز عوض.

---

## ۵) جریان‌های اصلی کاربر

### جریان ۱ — بارگذاری صفحهٔ اول
1. `main.jsx` → `App.jsx` → `AuthProvider` (اگر توکن هست `api.me()`) → `ShopProvider`.
2. `ShopProvider.reload()` با `Promise.all([api.items(), api.content().catch(()=>({}))])`
   — متن‌ها اگر نیایند فروشگاه را زمین نمی‌زنند.
3. `GET /api/items` → `Item.find({active:true}).sort({rank:1,name:1}).lean({virtuals:true})`.
4. `useMemo` سه ساختار می‌سازد: `bySlug` (Map)، `byKind` (سه آرایه)، `houseBlends`.
5. `Home.jsx` بر اساس `loading`/`loadError` یکی از سه حالت را رندر می‌کند.
6. `useEffect` لنگر: اگر آدرس `#cafe` داشت، ۶۰ms بعد از آمدن داده دوباره
   `scrollIntoView` می‌زند — چون موقع بارگذاری اول بخش‌ها کوتاه‌ترند.

### جریان ۲ — مرور و افزودن قهوهٔ ساده
`CatalogSection(kind='coffee')` → فیلتر دسته → جست‌وجو با debounce ۱۶۰ms
(روی `name, origin, spec, notes, pairs, groupLabel`) → مرتب‌سازی (شش گزینه) →
اگر `filter==='all' && sort==='rank' && !query` حالت **گروه‌بندی‌شده** →
`ItemCard` → `useReveal` → کاربر وزن و آسیاب انتخاب می‌کند →
`addWeighed(slug, grams, {grind})`:
```
key = lineKey(slug, grind, mix)        // slug|grind|mixSignature
اگر ردیف با همین کلید بود → grams جمع می‌شود
وگرنه ردیف تازه push می‌شود
toast('۲۵۰ گرم یرگاچف به سبد اضافه شد')
```
سپس `useEffect` سبد را در `localStorage['ghahve.cart']` می‌نویسد.

### جریان ۳ — ساختن میکس دلخواه
`BlendsSection` → `houseBlends` (isBlend && house، مرتب با rank) →
`BlendCard` با `useState(() => startingMix(item))` →
اهرم `<input type=range step=5>` → `applyPercent` → `blendPrice(item, mix)` →
`priceFor(perKg, grams)` روی کارت. افزودن دانه از `available`
(**همهٔ قهوه‌های غیرمیکس**، نه فقط `pool`) → `addBean` →
دکمهٔ «بازگشت به پیشنهاد ما» با مقایسهٔ `changed` → `addWeighed(slug, grams, {grind, mix})`.
`mixError` دکمهٔ افزودن را غیرفعال می‌کند.

### جریان ۴ — تسویه
`CartDrawer` حالت `cart` → دکمه → حالت `form` →
اعتبارسنجی سه فیلد (نام، `/^0\d{10}$/`، نشانی ≥۱۰ نویسه) →
`api.placeOrder({lines, customer})` — **فقط `slug`، `grams`/`qty`، `grind`، `mix`
فرستاده می‌شود؛ هیچ قیمتی نه**.

سمت سرور (`routes/orders.js`) به ترتیب:
1. `lines` خالی → ۴۰۰؛ بیش از ۱۰۰ ردیف → ۴۰۰.
2. مجموعهٔ `wanted` از `slug`ها **به‌علاوهٔ `mix[].slug`ها** ساخته می‌شود.
3. `Item.find({slug: {$in}, active: true})` → `bySlug` و `lookup`.
4. `grindMap()` از `Content` کلید `grinds` (یا `DEFAULT_GRINDS`).
5. برای هر ردیف: کالا موجود؟ → آسیاب معتبر (فقط اگر `grindable`) →
   میکس: اگر `!customizable` ترکیب رسمی جایگزین می‌شود؛ اگر `customizable`
   هر دانه باید `kind==='coffee'` و `!isBlend` باشد، بدون تکرار، `percent∈[0,100]`،
   `percent===0` نادیده، حداقل دو دانه، `|Σ−100| ≤ 1`.
6. `gear`: `qty ∈ [1,999]` صحیح؛ وزنی: `grams ≥ MIN_GRAMS[kind]` (قهوه ۱۰۰، پودر ۵۰) و `≤ 100000`.
7. `computeTotals(lines, lookup)` → `Order.create` با `unitPriceFor` و `lineTotal`
   و `grindLabel` و `mix` غنی‌شده با نام دانه.
8. پاسخ **از روی سند ذخیره‌شده** ساخته می‌شود، نه از ورودی.

کلاینت: `setDone(res)` → `clearCart()` → کامپوننت `Receipt` از روی پاسخ سرور
رسید می‌سازد → دکمهٔ «چاپ» → `window.print()` و `@media print` در `admin.css`
همه‌چیز جز `.drawer` را نامرئی می‌کند.

### جریان ۵ — ورود مدیر
`AdminLogin` → `api.login` → `POST /api/auth/login` →
`Admin.findOne().select('+passwordHash')` → `bcrypt.compare` →
**پیام یکسان برای نام کاربری و رمز غلط** → `signToken` →
`setToken` در `localStorage['ghahve.admin.token']` → `navigate('/admin/items')`.
`AdminLayout` اگر `checking` پیام می‌دهد، اگر `!admin` به `/admin/login` می‌فرستد.
هر ۴۰۱ در `api.request` باعث `clearToken()` + `onUnauthorized()` می‌شود.

### جریان ۶ — ویرایش کالا
`AdminItemForm` → `api.adminItem(id)` → فرم با `notes/pairs` تبدیل‌شده به متن
چندخطی → `preview` (شیء موقتی) به `ItemCard` واقعی داده می‌شود → پیش‌نمایش زنده →
`save()` اعتبارسنجی زودهنگام (نام، slug، قیمت>۰، و اگر میکس: ≥۲ دانه و Σ=۱۰۰) →
`api.updateItem` → `PUT /api/items/:id` → `pickBody` whitelist → `checkBlend`
(دانه‌ها باید `kind:'coffee'` و `!isBlend` باشند و میکس نتواند خودش را جزء خود کند) →
اگر `image` عوض شده `removeImageFile` فایل قدیمی را unlink می‌کند →
`Object.assign` + `save()` (تا `pre('validate')` اجرا شود) → `reloadShop()` → بازگشت.

### جریان ۷ — گزارش فروش
`AdminReports` → `api.reportSummary(period, count)` →
`bucketSeries` → `Order.find({createdAt: {$gte: windowStart}}, {createdAt,status,totals})`
(projection سبک) → ریختن در سطل‌ها با `bucketOf` → `windowTotals` +
`allTime` با aggregate `$cond` + `firstOrderAt`.
کلیک روی ردیف → `range` → `api.reportOrders({from,to,status,q,page,limit})` →
`buildFilter` + دو کوئری موازی (`find` و `countDocuments`) + aggregate `topItems`.
خروجی: `api.reportCsv/reportJson` → `download()` با هدر Authorization →
سرور با `cursor()` استریم می‌کند و `csvCell` مقادیر شروع‌شونده با `= + - @`
را با آپاستروف امن می‌کند (**جلوگیری از CSV injection**).

---

## ۶) مدیریت حالت و ارتباط ماژول‌ها

| حالت | جا | ماندگاری |
|---|---|---|
| کالاها، محتوا، loading، loadError | `ShopContext` | حافظه |
| سبد خرید | `ShopContext.cart` | `localStorage['ghahve.cart']` |
| آسیاب پیش‌فرض | `ShopContext.grind` | حافظه |
| toast | `ShopContext` + `useRef(timer)` | ۲۶۰۰ms |
| نشست مدیر | `AuthContext` | `localStorage['ghahve.admin.token']` |
| فیلتر سه فهرست | `Home.jsx` | حافظه (بالا نگه داشته شده چون `BrewSection`/`GuideSection` هم عوضش می‌کنند) |
| ترتیب/جست‌وجو/وزن هر بخش | `CatalogSection` | حافظه |
| ترکیب میکس هر کارت | `BlendCard` | حافظه |
| مرحلهٔ سبد، فرم، رسید | `CartDrawer` | حافظه |

الگوهای ارتباطی:
- **Context + hook سفارشی** (`useShop`, `useAuth`) — بدون Redux/Zustand.
- **Lifting state**: فیلترها در `Home` بالا برده شده‌اند.
- **Callback هوک‌شده**: `setUnauthorizedHandler(fn)` در `api.js` — ماژول بدون
  وابستگی به React، به React خبر می‌دهد.
- **Prop drilling کوتاه**: `setCoffeeFilter` از `Home` به `BrewSection`/`GuideSection`.
- **DOM مستقیم**: `document.getElementById(id).scrollIntoView`،
  `document.body.style.overflow = 'hidden'` هنگام باز بودن مودال/کشو،
  `IntersectionObserver` در `useReveal` و افزودن کلاس `.is-in`.
- **رویداد صفحه‌کلید**: `Escape` در `CartDrawer`, `ItemDetail`, `CafeSection`, `AdminReports`.
- **بازگرداندن فوکوس**: `lastFocus.current?.focus?.()` در `CartDrawer` و `ItemDetail`.
- **debounce دستی** با `useRef(timer)`: ۱۶۰ms کاتالوگ، ۲۰۰ms باشگاه، ۲۵۰ms کالاها و گزارش‌ها.

---

## ۷) سیستم طراحی

### توکن‌های رنگ (`web/src/style.css` خط ۸ تا ۳۷)
```
--paper:       #F6EFE3   کاغذ کاهیِ گرم (پس‌زمینهٔ صفحه)
--paper-2:     #EFE4D2   بخش‌های soft و برچسب‌ها
--paper-3:     #FBF6EA   بدنهٔ کارت‌ها
--line:        #DCCDB4   خط جداکننده و حاشیه
--espresso:    #1E1710   متن اصلی و نوارهای تیره
--espresso-2:  #2E241A   حالت hover تیره
--soft:        #6B5B45   متن فرعی
--ink-2:       #4A3E2E   متن معرفی (lead)
--sage:        #A9B78C   دانهٔ خام
--sage-deep:   #5C6B47   eyebrow و تأکید سبز
--cherry:      #B23A2B   رنگ کنش اصلی (دکمه، badge)
--cherry-dark: #8E2A1E   hover دکمهٔ اصلی
--brass:       #C8963C   عدد سبد، لهجهٔ طلایی
--latte:       #C9A87C   گرادیان سنجهٔ رست
--crema:       #E8CBA0   eyebrow روی زمینهٔ تیره
```
کامنت خودِ فایل می‌گوید پالت از «دانهٔ خام سبز، پوستهٔ گیلاس قرمز، دانهٔ رست تیره،
شیر و کارامل» گرفته شده. دو یادداشت در کد نشان می‌دهد `--soft` و `--sage-deep`
عمداً تیره‌تر شده‌اند تا کنتراست روی زمینهٔ کاهی کافی باشد.

### دیگر توکن‌ها
```
--radius: 16px   --radius-s: 10px
--shadow:      0 18px 40px -28px rgba(30,23,16,.5)
--shadow-lift: 0 26px 50px -30px rgba(30,23,16,.62)
--wrap:  1200px      (.wrap = width:min(1200px, 92%))
--ease:  cubic-bezier(.22,.61,.36,1)
```

### تایپوگرافی
- بدنه: `"Vazirmatn", system-ui, "Segoe UI", Tahoma` — ۱۶px، `line-height: 1.85`.
- تیترها (`h1..h4`): `"Lalezar", "Vazirmatn"` با `font-weight:400` و `line-height:1.28`.
- مقیاس سیال با `clamp`:
  `h1: clamp(2.5rem, 5.6vw, 4.4rem)` · `h2: clamp(1.9rem, 3.6vw, 2.7rem)` ·
  `.cat-head h3: 1.55rem` · `.card h3: 1.4rem` · `.price b: 1.35rem`
- ریزمتن‌ها: `.eyebrow .78rem` با `letter-spacing:.14em` · `.card-origin .72rem`
  با `.1em` · `.notes li .74rem` · `.card-process .8rem`
- فونت‌ها از **Google Fonts** بارگذاری می‌شوند (`client/index.html`).

### فاصله‌گذاری
بدون مقیاس عددی رسمی؛ الگوی غالب:
`.section{ padding-block: clamp(58px,7.5vw,104px) }`،
`.grid-inner{ gap: 22px }`، `#grid{ gap: clamp(34px,5vw,56px) }`،
`.card-body{ padding: 16px 20px 20px }`، `.toolbar{ gap:16px; margin-block-end:32px }`.

### نقاط شکست
`1000px` (گالری) · `960px` (hero/bulk/story/footer/club/about تک‌ستونه) ·
`760px` (منوی برگر، گالری تک‌ستونه، شبکهٔ میکس تک‌ستونه) ·
`prefers-reduced-motion: reduce` (همهٔ انیمیشن‌ها ۰٫۰۱ms).
پنل: `1080px`, `900px`, `760px` (`admin.css`).

### قرارداد نام‌گذاری
کلاس‌های تخت و معنایی به انگلیسی، با خط تیره:
بلوک `.card` → عناصر `.card-media`, `.card-body`, `.card-top`, `.card-foot`;
حالت‌ها با پیشوند `is-`: `.is-active`, `.is-in`, `.is-open`, `.is-off`, `.is-on`.
گونه‌ها با کلاس دوم: `.card.card-gear`, `.btn.btn-primary`, `.chip.chip-sm`.
**نه BEM کامل** (بدون `__` و `--`) و **نه utility class**.

### راست‌به‌چپ
همهٔ فاصله‌ها با **ویژگی‌های منطقی**:
`inset-inline-start`, `inset-block-end`, `margin-inline-auto`,
`padding-inline-end`, `border-inline-end`, `margin-block`.
`dir="rtl"` روی `<html>` در `client/index.html`.
جاهایی که باید LTR بمانند صریحاً علامت خورده‌اند:
`<b dir="ltr">{order.code}</b>`، `<span dir="ltr">{phone}</span>`،
`<input dir="ltr">` برای نام کاربری/رمز/قیمت/slug، `.cell-ltr` در جدول باشگاه.

### جزئیات ظاهری خاص
- **بافت کاغذ**: `body::after` با `feTurbulence` به‌صورت data-URI و `opacity:.05`.
- **گلاس‌مورفیسم**: `.site-header{ backdrop-filter: blur(12px) }` و `.card-chip{ blur(4px) }`.
- **منحنی رست**: SVG تزئینی در Hero با انیمیشن `stroke-dashoffset`.
- **کارت‌ها** با `opacity:0; transform:translateY(16px)` شروع و با `.is-in` وارد می‌شوند.

---

## ۸) امنیت، دسترس‌پذیری، کارایی، SEO

### چیزهایی که **هست**
**امنیت**
- bcrypt با cost ۱۲؛ `passwordHash` با `select:false`؛ حذف در `toJSON`.
- JWT با `tokenVersion` — تغییر رمز همهٔ توکن‌های قبلی را باطل می‌کند.
- پیام یکسان برای نام کاربری/رمز غلط (user enumeration).
- **بازمحاسبهٔ کامل قیمت روی سرور** — مهم‌ترین کنترل امنیتی پروژه.
- whitelist نوشتن (`WRITABLE` در `routes/items.js`) — mass assignment بسته است.
- whitelist کلیدهای محتوا (`KEYS` از `DEFAULT_CONTENT`).
- escape کاراکترهای regex در جست‌وجو (`q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')`)
  در `items.js`, `club.js`, `reports.js` — از ReDoS/regex injection جلوگیری می‌کند.
- آپلود: whitelist شش MIME، سقف ۴ MB، نام تصادفی ۱۲ بایتی (path traversal بسته).
- `removeImageFile` فقط مسیرهای `'/uploads/'` را با `path.basename` پاک می‌کند.
- **CSV injection**: `csvCell` در `reports.js` مقادیر شروع‌شونده با `= + - @ \t \r`
  را با `'` امن می‌کند.
- `express.json({limit:'1mb'})` و سقف ۱۰۰ ردیف در سبد.
- `.env` در `.gitignore`؛ `.env.example` هشدار انتشار دارد.

**دسترس‌پذیری**
- `skip-link` به `#products`.
- `dir="rtl"` + `lang="fa"`.
- `role="dialog" aria-modal="true" aria-labelledby` روی کشوی سبد و مودال معرفی.
- بستن با `Escape` در چهار جا؛ بازگرداندن فوکوس؛ قفل اسکرول بدنه.
- `aria-label` روی دکمه‌های آیکونی، اسلایدرها، سلکت‌ها، دکمه‌های +/−.
- `aria-expanded`/`aria-controls` روی برگر و آکاردئون‌ها؛ `aria-pressed` روی ردیف گزارش.
- `role="status" aria-live="polite"` روی toast؛ `role="alert"` روی خطاها.
- `aria-hidden="true"` روی همهٔ SVGهای تزئینی؛ `role="img" aria-label` روی سنجهٔ رست و آرت.
- `:focus-visible{ outline: 3px solid var(--cherry); outline-offset: 3px }`.
- `prefers-reduced-motion` هم در CSS و هم در `useReveal.js`.
- `alt` توصیفی روی همهٔ تصویرها؛ `<caption>` روی جدول پله‌های تخفیف؛ `scope="col"`.
- ردیف‌های گزارش با `tabIndex={0}` + `onKeyDown` (Enter/Space) قابل استفاده با صفحه‌کلید.

**کارایی**
- `useMemo`/`useCallback` گسترده در `ShopContext` و کامپوننت‌های فهرست.
- `Map` برای `bySlug` به‌جای `find()` تکراری.
- `.lean()` در همهٔ کوئری‌های خواندنی سرور.
- projection سبک در `reports/summary` (فقط `createdAt, status, totals`).
- استریم با `cursor()` در هر دو خروجی — حافظهٔ سرور با پشتیبان بزرگ پر نمی‌شود.
- `loading="lazy"` روی تصویرهای غیر-hero.
- debounce روی همهٔ جست‌وجوها.
- `maxAge:'7d'` روی `/uploads`.
- SVGهای تولیدی inline — بدون درخواست شبکه، بدون فایل تصویر.
- `Promise.all` برای بارگذاری موازی.

**SEO**
- `<title>` و `<meta name="description">` فارسی و توصیفی.
- `lang="fa"`، favicon اختصاصی، ساختار تیتر منظم (یک `h1`، سپس `h2`/`h3`).
- HTML معنایی: `header`, `main`, `section`, `article`, `aside`, `figure`, `footer`, `dl`.

### چیزهایی که **نیست** (صادقانه)
**امنیت**
- بدون rate limiting روی `/api/auth/login` — brute force باز است.
- بدون `helmet` (بدون CSP، HSTS، X-Frame-Options…).
- بدون CSRF (البته با Bearer token در header خطرش کم است).
- **توکن در `localStorage`** — در برابر XSS آسیب‌پذیر است؛ `httpOnly cookie` امن‌تر بود.
- `CardArt` از `dangerouslySetInnerHTML` استفاده می‌کند؛ ورودی‌اش خودمان تولید می‌کنیم
  ولی `slug` و `name` مدیر داخل SVG می‌روند → اگر مدیر بدخواه باشد XSS ممکن است.
- بدون refresh token؛ توکن ۱۲ ساعته و بعد باید دوباره وارد شد.
- بدون sanitize روی ورودی‌های متنی (`story`, `taste`, نشانی…).
- `POST /api/orders` عمومی و بی‌محدودیت — می‌شود با اسکریپت هزاران سفارش ساخت.
- `cors` با `|| true` وقتی `CLIENT_ORIGIN` تنظیم نشده باشد یعنی **هر مبدأیی مجاز**.
- بدون تأیید شماره (OTP)؛ سفارش با شمارهٔ جعلی ثبت می‌شود.
- بدون لاگ حسابرسی (چه کسی چه کالایی را حذف کرد).

**دسترس‌پذیری**
- **بدون focus trap کامل** در کشو/مودال — Tab می‌تواند به پشت‌صحنه برود.
- `<figure onClick>` در گالری کافه — روی `div` کلیک‌پذیر بدون `role="button"` و `tabIndex`.
- `.sheet-back` هم `onClick` دارد (بستن با کلیک بیرون) بدون معادل صفحه‌کلید صریح.
- کنتراست `--soft` روی `--paper-2` مرزی است.
- بدون تست با screen reader و بدون بررسی خودکار (axe/Lighthouse) در مخزن.

**کارایی**
- **بدون کد اسپلیت**: پنل مدیریت با فروشگاه در یک باندل است
  (`admin.css` هم در `main.jsx` وارد می‌شود).
- بدون `React.lazy`/`Suspense`.
- `GET /api/items` **همهٔ** کالاها را یکجا می‌دهد — بدون صفحه‌بندی.
- بدون virtualization برای فهرست‌های بلند.
- بدون فشرده‌سازی تصویر آپلودی (تا ۴ MB خام سرو می‌شود).
- بدون `compression` middleware، بدون ETag دستی، بدون CDN.
- فونت از Google Fonts (وابستگی و RTT اضافه)؛ بدون `font-display` سفارشی جز `&display=swap`.
- بدون index روی `Order.createdAt` — گزارش‌ها با رشد داده کند می‌شوند.

**SEO**
- **CSR خالص** — بدون SSR/SSG؛ خزندهٔ بدون JS صفحهٔ خالی می‌بیند.
- تک‌صفحه با لنگر — هر قهوه URL اختصاصی ندارد، پس قابل ایندکس شدن جدا نیست.
- بدون `sitemap.xml`، بدون `robots.txt`.
- بدون JSON-LD (`Product`, `Offer`, `LocalBusiness`) — نتایج غنی گوگل از دست می‌رود.
- بدون Open Graph / Twitter Card.
- بدون `canonical`.
- عنوان و توضیح ثابت‌اند (چون تک‌صفحه است).

**کیفیت مهندسی**
- **صفر تست** — نه واحد، نه یکپارچه، نه E2E.
- بدون ESLint/Prettier config در مخزن (فقط چند `eslint-disable-next-line` پراکنده).
- بدون CI/CD، بدون Dockerfile.
- بدون TypeScript یا JSDoc نوع‌دار (فقط چند JSDoc توضیحی).
- **دوگانگی `pricing.js`** — دو نسخهٔ دستی همگام‌شونده؛ خطر واگرایی.
- **دوگانگی `taxonomy.js` / `groups.js`** — کلیدها در دو جا تکرار شده‌اند.
- `pool` در مدل هست ولی `AdminItemForm` همیشه `pool: []` می‌فرستد و
  `BlendsSection` هم از همهٔ قهوه‌ها استفاده می‌کند — یعنی فیلد عملاً مرده است.
- `component.min/max/locked` در مدل هست ولی فرم مدیریت همیشه `0/100/false` می‌فرستد.
- نسخهٔ ایستای ریشه (۱۲۱ KB `script.js`) هنوز در مخزن است.

---

## ۹) تصمیمات معماری (خام، برای فصل ۹)

1. **مدل واحد `Item` با فیلد `kind`** به‌جای سه مدل جدا.
   شواهد: کامنت خط ۳۴۲ `models/Item.js`؛ `KINDS` در `groups.js`؛ یک `ItemCard`؛
   یک `CatalogSection`؛ یک `AdminItemForm`.
   بها: `pre('validate')` پیچیده و فیلدهایی که برای بعضی نوع‌ها بی‌معنی‌اند.

2. **`slug` به‌عنوان کلید منطقی به‌جای `ObjectId ref`.**
   `slug` هم در URL، هم بذر تولید تصویر، هم کلید میکس، هم کلید سفارش است.
   بها: بدون یکپارچگی ارجاعی؛ اعتبارسنجی دستی در `checkBlend` و `orders.js`.

3. **snapshot کردن سفارش‌ها.** کامنت خط ۵۳۷ `models/Order.js`.
   قیمت، نام و `grindLabel` در خودِ سفارش می‌مانند.

4. **آینه‌سازی عمدی `pricing.js`.** برای «همان عددی که می‌بینید ثبت می‌شود»
   بدون رفت‌وبرگشت شبکه در هر تغییر اسلایدر.

5. **تقویم شمسی دست‌نویس** به‌جای `moment-jalaali`/`date-fns-jalali`.
   صفر وابستگی؛ کنترل کامل روی DST تهران.

6. **تصویر تولیدی به‌جای عکس محصول.** ۱۰۶ کالا بدون یک فایل تصویر؛
   `seeded(slug)` طرح را قطعی می‌کند؛ مدیر می‌تواند عکس واقعی جایگزین کند.

7. **محتوای سایت در پایگاه داده با `data: Mixed` + `contentSchema.js`.**
   فرم پنل از روی توصیف ساخته می‌شود؛ افزودن فیلد = دو فایل عوض می‌شود.

8. **Context API خالص.** حجم حالت کوچک است؛ Redux اضافه‌کاری بود.

9. **سبد در `localStorage` با پاک‌سازی پس از بارگذاری.**
   `useEffect` ردیف‌هایی که کالا یا دانهٔ میکس‌شان دیگر نیست را حذف می‌کند.

10. **`lineKey = slug|grind|mixSignature`.** اجازه می‌دهد یک قهوه چند بار
    با تنظیمات مختلف در سبد باشد؛ `setLineGrind` ردیف‌های همسان را ادغام می‌کند.

11. **تخفیف بر پایهٔ وزن سبد، نه مبلغ.** با مدل «به گرم بفروش» سازگار است
    و مشتری را تشویق می‌کند از چند خاستگاه بردارد (`BulkSection` صریحاً می‌گوید).

12. **پرفروش‌ها از سفارش‌های واقعی + دو سوپاپ دستی** (`pinnedTop`, `excludeTop`).

13. **Vite proxy** به‌جای CORS باز در توسعه — آدرس‌ها در توسعه و تولید یکسان‌اند.

14. **همان سرور Express فایل‌های `client/dist` را هم سرو می‌کند** — یک فرآیند در تولید.

15. **پیام‌های کنسول انگلیسی، پیام‌های مرورگر فارسی.**
    دلیل صریح در `db.js`: کنسول ویندوز فارسی را `?` چاپ می‌کند.

16. **`seed` غیرمخرب به‌صورت پیش‌فرض.** `enrichExisting` فقط فیلدهای خالی را پر می‌کند
    و `featured` را عمداً تعیین نمی‌کند تا سلیقهٔ مدیر بازنویسی نشود (کامنت خط ۱۰۳ `seed.js`).

17. **`tokenVersion` به‌جای فهرست سیاه توکن.** یک عدد در سند مدیر، بدون جدول اضافه.

18. **بازهٔ گزارش روی تقویم شمسی و وقت تهران.** «مرداد» یعنی مرداد، نه August.

---

## ۱۰) اعداد کلیدی برای ارجاع سریع

| چیز | مقدار | منبع |
|---|---|---|
| پله‌های تخفیف | ۵٪ از ۱ کیلو، ۱۰٪ از ۳ کیلو، ۱۵٪ از ۵ کیلو | `pricing.js` |
| هزینهٔ ارسال | ۶۵٬۰۰۰ تومان | `pricing.js` |
| ارسال رایگان از | ۱۰۰۰ گرم | `pricing.js` |
| گرد کردن قیمت | نزدیک‌ترین ۱۰۰۰ تومان | `priceFor` |
| کمینهٔ وزن قهوه / پودر | ۱۰۰ / ۵۰ گرم | `orders.js` `MIN_GRAMS` |
| بیشینهٔ وزن یک ردیف | ۱۰۰٬۰۰۰ گرم | `orders.js` |
| بیشینهٔ تعداد ابزار | ۹۹۹ | `orders.js` |
| بیشینهٔ ردیف سبد | ۱۰۰ | `orders.js` |
| وزن‌های پیش‌فرض قهوه | ۱۰۰/۲۵۰/۵۰۰/۱۰۰۰ گرم، پیش‌فرض ۲۵۰، گام ۱۰۰ | `groups.js` |
| وزن‌های پیش‌فرض پودر | ۵۰/۱۰۰/۲۵۰/۵۰۰ گرم، پیش‌فرض ۱۰۰، گام ۵۰ | `groups.js` |
| اسلایدر Hero | ۱۰۰..۲۰۰۰ گرم، گام ۵۰ | `Hero.jsx` |
| اهرم میکس | ۰..۱۰۰٪، گام ۵ | `BlendsSection.jsx` |
| bcrypt cost | ۱۲ | `Admin.js` |
| عمر توکن | `TOKEN_HOURS` (پیش‌فرض ۱۲ ساعت) | `middleware/auth.js` |
| سقف آپلود | ۴ MB | `upload.js` |
| سقف بدنهٔ JSON | ۱ MB | `index.js` |
| سقف فهرست سفارش (پنل) | ۳۰۰ | `orders.js` |
| سقف اعضای باشگاه | ۱۰۰۰ | `club.js` |
| صفحه‌بندی گزارش | پیش‌فرض ۵۰، بیشینه ۲۰۰، در UI ۲۵ | `reports.js` / `AdminReports.jsx` |
| بازه‌های پیش‌فرض گزارش | روز ۳۰، هفته ۱۲، ماه ۱۲، سال ۶ | `reports.js` |
| سقف بازه‌ها | روز ۳۶۶، هفته ۲۶۰، ماه ۱۲۰، سال ۴۰ | `reports.js` |
| مدت toast | ۲۶۰۰ms | `ShopContext.jsx` |
| تأخیر reveal کارت | `i × 55ms`، آستانه ۰٫۱۲ | `useReveal.js` |
| تعداد کالاهای اولیه | ۱۰۶ (۳۲+۴۰+۳۴) | `seed-items.js` |
| تعداد میکس اولیه | ۵ | `seed-enrich.js` |
| تعداد شکل ابزار / پودر | ۳۶ / ۱۴ | `taxonomy.js` |
| تعداد جنس ابزار / رنگ پودر | ۱۱ / ۱۶ | `taxonomy.js` |
| پروفایل‌های طعمی | ۸ | `TASTE_KEYS` |
| گزینه‌های آسیاب | ۷ | `DEFAULT_GRINDS` |
