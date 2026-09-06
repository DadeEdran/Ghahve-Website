# ۴. مدل داده و ساختار بانک اطلاعاتی

## ۴.۱ نمای کلی

پایگاه دادهٔ `ghahve` پنج مجموعه (collection) دارد:

| مجموعه | مدل | تعداد اولیه | نقش |
|---|---|---|---|
| `items` | `Item` | ۱۰۶ | همهٔ کالاها — قهوه، ابزار، پودر |
| `orders` | `Order` | ۰ | سفارش‌های ثبت‌شده |
| `admins` | `Admin` | ۱ | حساب مدیر |
| `contents` | `Content` | ۷ | متن‌های قابل ویرایش سایت |
| `clubmembers` | `ClubMember` | ۰ | اعضای باشگاه مشتریان |

نکتهٔ ساختاری مهم: **در کل پروژه حتی یک `ObjectId ref` وجود ندارد.**
هیچ `populate`ای صدا زده نمی‌شود. تنها پیوند بین مجموعه‌ها، فیلد `slug`
است که به‌عنوان **کلید منطقی** به کار می‌رود.

---

## ۴.۲ نمودار ER

```
                    ┌──────────────────────────────────────┐
                    │              items                   │
                    │──────────────────────────────────────│
                    │ _id          ObjectId  (PK)          │
                    │ slug         String    (UNIQUE) ◄────┼──┐
                    │ kind         enum coffee|gear|powder │  │
                    │ name, origin, spec, group, tag       │  │
                    │ meter        1..5                    │  │
                    │ price        Number  (هر کیلو/هر عدد)│  │
                    │ stock        Number|null (نامحدود)   │  │
                    │ notes[], pairs[], tastes[]           │  │
                    │ shape, mat, tone, zoom, image        │  │
                    │ rank, active, featured               │  │
                    │ pinnedTop, excludeTop, grindable     │  │
                    │ story, taste, recommend              │  │
                    │ isBlend, house, customizable         │  │
                    │ surcharge    Number                  │  │
                    │ components[] ──┐                     │  │
                    │ pool[]       ──┼─────────────────────┼──┘
                    │ createdAt, updatedAt                 │   ارجاع منطقی
                    └────────────────┼─────────────────────┘   با slug
                                     │ (embedded)                (بدون FK)
                          ┌──────────▼──────────┐
                          │  components[]        │
                          │  (زیرسند، بدون _id)  │
                          │─────────────────────│
                          │ slug     String ────┼──► items.slug
                          │ percent  0..100     │
                          │ min      0..100     │
                          │ max      0..100     │
                          │ locked   Boolean    │
                          └─────────────────────┘


   ┌────────────────────────────────────────────────┐
   │                    orders                      │
   │────────────────────────────────────────────────│
   │ _id        ObjectId  (PK)                      │
   │ code       String    (UNIQUE, مثل «M3K2-8412») │
   │ status     enum new|processing|done|canceled   │
   │ customer   { name، phone، address، note }      │
   │ totals     { grams، pieces، base، discount،    │
   │              discountLabel، shipping، total }  │
   │ lines[]  ──┐                                   │
   │ createdAt, updatedAt                           │
   └────────────┼───────────────────────────────────┘
                │ (embedded)
     ┌──────────▼──────────────────────────┐
     │  lines[]  (زیرسند، بدون _id)         │
     │─────────────────────────────────────│
     │ kind       String                   │
     │ slug       String ──────────────────┼─ ─ ─► items.slug
     │ name       String  (snapshot)       │      (سست — کالا ممکن است
     │ unitPrice  Number  (snapshot)       │       بعداً حذف شود)
     │ grams, qty Number                   │
     │ lineTotal  Number  (snapshot)       │
     │ grind, grindLabel  String           │
     │ mix[]    ──┐                        │
     └────────────┼────────────────────────┘
                  │ (embedded)
        ┌─────────▼───────────────┐
        │  mix[]  (بدون _id)      │
        │─────────────────────────│
        │ slug     String ────────┼─ ─ ─► items.slug
        │ name     String (snapshot)
        │ percent  Number         │
        └─────────────────────────┘


  ┌──────────────────────┐   ┌────────────────────────┐   ┌──────────────────────┐
  │       admins         │   │       contents         │   │     clubmembers      │
  │──────────────────────│   │────────────────────────│   │──────────────────────│
  │ _id      ObjectId    │   │ _id      ObjectId      │   │ _id      ObjectId    │
  │ username String (UQ) │   │ key      String (UQ)   │   │ name     String      │
  │ passwordHash         │   │ data     Mixed         │   │ phone    String (UQ) │
  │   (select:false)     │   │   ← شکلش به key بستگی  │   │ email    String      │
  │ tokenVersion Number  │   │     دارد               │   │ taste    String ─ ─ ─┼─► TASTE_KEYS
  │ createdAt, updatedAt │   │ createdAt, updatedAt   │   │ note، active         │
  └──────────────────────┘   └────────────┬───────────┘   │ createdAt, updatedAt │
                                          │                └──────────────────────┘
                        contents.suggest.profiles[].picks[]
                                          └─ ─ ─► items.slug

  * هیچ مجموعه‌ای به مجموعهٔ دیگر ObjectId ref ندارد.
  * خط ممتد (───) = ارجاع منطقی که سرور اعتبارسنجی می‌کند.
  * خط چین (─ ─ ─) = ارجاع سست؛ ممکن است هدفش دیگر وجود نداشته باشد.
```

---

## ۴.۳ مدل `Item` — قلب پروژه

فایل: `server/src/models/Item.js` (۲۳۶ خط)

### الف) زیرسند `componentSchema`

```js
const componentSchema = new mongoose.Schema(
  {
    slug:    { type: String, required: true },
    percent: { type: Number, required: true, min: 0, max: 100 },
    min:     { type: Number, default: 0,   min: 0, max: 100 },
    max:     { type: Number, default: 100, min: 0, max: 100 },
    locked:  { type: Boolean, default: false }
  },
  { _id: false }
);
```

`{ _id: false }` یعنی Mongoose برای هر جزء یک `ObjectId` جداگانه نسازد.
این زیرسندها هویت مستقل ندارند و همیشه با سند والد خوانده و نوشته
می‌شوند، پس `_id` فقط حجم اضافه بود.

> **نکته: سه فیلد مرده**
> `min`، `max` و `locked` در مدل تعریف شده‌اند و در دادهٔ seed هم مقدار
> واقعی دارند (`{slug:'cerrado', percent:70, min:40, max:90}`)، اما
> `AdminItemForm` همیشه `min: 0, max: 100, locked: false` می‌فرستد و
> `BlendsSection` هم اصلاً به آن‌ها نگاه نمی‌کند — اهرم‌ها همیشه ۰ تا ۱۰۰
> حرکت می‌کنند. کامنت خط ۲۶۹ `AdminItemForm.jsx` این را عمدی نشان می‌دهد:
> «ترکیب ما فقط پیشنهاد است — بازهٔ مجاز و قفل نداریم، چون مشتری در
> انتخابش کاملاً آزاد است.» یعنی سیاست تجاری عوض شده اما فیلدها در مدل
> باقی مانده‌اند.

### ب) جدول کامل فیلدها

| فیلد | نوع | پیش‌فرض | قیدها | برای کدام `kind` |
|---|---|---|---|---|
| `kind` | String | — | required، enum، index | همه |
| `slug` | String | — | required، unique، lowercase، trim، `/^[a-z0-9][a-z0-9-]*$/` | همه |
| `name` | String | — | required، trim | همه |
| `origin` | String | `''` | trim | همه |
| `spec` | String | `''` | trim | همه |
| `group` | String | — | required، index، عضو `GROUPS_BY_KIND[kind]` | همه |
| `meter` | Number | `3` | ۱..۵ | همه |
| `price` | Number | — | required، `min: 0` | همه |
| `stock` | Number \| null | `null` | `min: 0`، گِرد به عدد صحیح | همه |
| `notes` | [String] | `[]` | — | همه |
| `pairs` | [String] | `[]` | برای قهوه پاک می‌شود | ابزار، پودر |
| `tag` | String | `''` | trim | همه |
| `shape` | String | `''` | باید در whitelist باشد | ابزار، پودر |
| `mat` | String | `''` | `GEAR_MATERIALS` | ابزار |
| `tone` | String | `''` | `POWDER_TONES` | پودر |
| `zoom` | Number | `1` | ۰٫۴..۲ | ابزار، پودر |
| `image` | String | `''` | مسیر `/uploads/...` | همه |
| `rank` | Number | `999` | — | همه |
| `active` | Boolean | `true` | — | همه |
| `story` | String | `''` | trim | همه (عملاً قهوه) |
| `taste` | String | `''` | trim | همه |
| `recommend` | String | `''` | trim | همه |
| `tastes` | [String] | `[]` | زیرمجموعهٔ `TASTE_KEYS` | قهوه |
| `isBlend` | Boolean | `false` | — | قهوه |
| `house` | Boolean | `false` | — | قهوه |
| `customizable` | Boolean | `false` | — | قهوه |
| `components` | [componentSchema] | `[]` | ≥۲ و Σ=۱۰۰ اگر `isBlend` | قهوه |
| `pool` | [String] | `[]` | — | قهوه |
| `surcharge` | Number | `0` | `min: 0` | قهوه |
| `featured` | Boolean | `false` | — | همه |
| `pinnedTop` | Boolean | `false` | — | همه |
| `excludeTop` | Boolean | `false` | — | همه |
| `grindable` | Boolean | `false` | خودکار تنظیم می‌شود | قهوه = `true` |

به‌علاوهٔ `createdAt` و `updatedAt` که با `{ timestamps: true }` خودکارند.

### ب‌–۲) فیلد `stock` — و چرا `null` با صفر یکی نیست

این فیلد با مورد ۳۴ اضافه شد و تنها فیلدی است که **سه** حالت معنادار
دارد، نه دو تا:

```js
/* ── موجودی انبار ──
   واحدش همان واحد فروش است: گرم برای قهوه و پودر،
   عدد برای ابزار.

   null یعنی «نامحدود»، و پیش‌فرض هم همین است — چون
   تا پیش از این هیچ موجودی‌ای در کار نبود و همهٔ
   کالاهای موجود باید بدون مهاجرت مثل قبل کار کنند.
   صفر یعنی «تمام شد»، که با null یکی نیست. */
stock: { type: Number, default: null, min: [0, 'موجودی نمی‌تواند منفی باشد'] },
```

| مقدار | معنا | در ثبت سفارش |
|---|---|---|
| `null` | نامحدود — شمرده نمی‌شود | اصلاً لمس نمی‌شود |
| عددی `> 0` | همان‌قدر مانده | با `$inc` اتمی کم می‌شود |
| `0` | تمام شد | هر سفارشی ۴۰۹ می‌گیرد |

**چرا `null` پیش‌فرض است و نه صفر؟** چون این فیلد به یک پایگاه دادهٔ
پُر اضافه شد. اگر پیش‌فرضش صفر بود، لحظه‌ای که کد بالا می‌آمد هر ۱۰۶
کالا «ناموجود» می‌شدند. `null` یعنی «این کالا هنوز شمرده نشده» و رفتار
پیش از مورد ۳۴ را دقیقاً حفظ می‌کند — بدون هیچ مهاجرتی.

سه جای دیگر هم به همین سه‌حالتی بودن حساس‌اند:

- `server/src/lib/stock.js` → `isTracked(item)` که فقط عدد متناهی را
  «شمرده‌شده» می‌داند؛
- قلاب `pre('validate')` که موجودی را مثل قیمت گِرد و منفی‌نشدنی می‌کند
  (`Math.max(0, Math.round(this.stock))`)، چون مقایسهٔ اتمی روی عدد صحیح
  انجام می‌شود و اعشار فقط دردسر است؛
- فرم کالا در پنل، که **خالی گذاشتن کادر** را به `null` ترجمه می‌کند نه
  به صفر.

> **هشدار: یک لبهٔ تیز**
> موجودیِ یک میکس از خودِ سند میکس کم می‌شود، نه از دانه‌های اجزایش.
> پس اگر برای میکسی عدد بگذارید، فروشش موجودی دانه‌ها را کم نمی‌کند.
> میکس‌ها را معمولاً `null` بگذارید. لغو سفارش هم موجودی را
> برنمی‌گرداند — هر دو در مورد ۳۴ فصل ۱۱ به‌عنوان باقی‌ماندهٔ باز ثبت
> شده‌اند.

### ج) فیلد مجازی `weighed`

```js
itemSchema.virtual('weighed').get(function () {
  return IS_WEIGHED[this.kind] === true;
});
```

این فیلد در پایگاه داده ذخیره نمی‌شود اما در پاسخ API می‌آید، چون:

```js
toJSON: { virtuals: true, transform(_doc, ret) { delete ret.__v; return ret; } }
```

و در کوئری‌ها هم صریحاً درخواست می‌شود:

```js
const items = await Item.find(filter).sort({ rank: 1, name: 1 }).lean({ virtuals: true });
```

نکتهٔ ظریف: `.lean()` معمولاً سند ساده برمی‌گرداند و virtual ها را ندارد؛
`.lean({ virtuals: true })` در Mongoose 8 آن‌ها را هم می‌آورد. بدون این،
کلاینت نمی‌فهمید کالا وزنی است یا عددی.

### د) ایندکس‌ها

```js
itemSchema.index({ kind: 1, rank: 1 });
itemSchema.index({ name: 'text', origin: 'text', spec: 'text' });
```

به‌علاوهٔ ایندکس‌های تک‌فیلدی که در تعریف فیلدها آمده‌اند
(`kind`، `group`) و ایندکس یکتای `slug`.

> **نکتهٔ صادقانه**
> ایندکس متنی (`text`) ساخته شده اما **هیچ‌جا استفاده نمی‌شود**.
> جست‌وجوی پنل مدیریت به‌جای `$text` از `RegExp` استفاده می‌کند:
> ```js
> const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
> filter.$or = [{ name: rx }, { slug: rx }, { origin: rx }, { spec: rx }, { tag: rx }];
> ```
> دلیل احتمالی: `$text` روی فارسی stemming درستی ندارد و جست‌وجوی جزئی
> (مثل «کنی» برای «کنیا») را پشتیبانی نمی‌کند، در حالی که regex می‌کند.
> اما نتیجه این است که یک ایندکس بدون استفاده روی دیسک نگه داشته می‌شود.

---

## ۴.۴ قلاب `pre('validate')` مدل `Item`

این قلاب مهم‌ترین بخش منطق مدل است و **هفت گروه قاعده** را اعمال می‌کند.
در فصل ۷ خط‌به‌خط بررسی می‌شود؛ اینجا خلاصهٔ رفتاری:

| شماره | قاعده | نتیجه |
|---|---|---|
| ۱ | `group` باید عضو `GROUPS_BY_KIND[kind]` باشد | خطای «دستهٔ «x» برای این نوع کالا تعریف نشده است» |
| ۲ | `gear`: پیش‌فرض `shape='mug'`، `mat='steel'`؛ `tone` پاک | جلوگیری از کارت خالی |
| ۳ | `powder`: پیش‌فرض `shape='scoop'`، `tone='cocoa'`؛ `mat` پاک | همان |
| ۴ | `coffee`: `shape/mat/tone/pairs` پاک، `grindable = true` | «هر قهوه‌ای آسیاب‌شدنی است» |
| ۵ | غیرقهوه: `grindable=false` و همهٔ فیلدهای میکس پاک | «فقط قهوه میکس می‌شود» |
| ۶ | اگر `isBlend`: ≥۲ جزء، `\|Σ−۱۰۰\| ≤ ۱`، بدون تکرار، `min ≤ max` | خطاهای فارسی جداگانه |
| ۷ | اگر `!isBlend`: `components/pool` پاک، `customizable/house=false` | تمیز ماندن سند |
| ۸ | گِرد کردن `price`، `meter` و `stock` | بدون اعشار سرگردان؛ `null` دست‌نخورده |

و در انتها:

```js
if (typeof this.price === 'number') this.price = Math.round(this.price);
if (typeof this.meter === 'number') this.meter = Math.round(this.meter);

/* موجودی هم همین‌طور — نیم گرم و نیم عدد معنا ندارد.
   مقایسهٔ اتمی هنگام ثبت سفارش روی همین عدد صحیح
   انجام می‌شود، پس اعشار فقط دردسر است. */
if (typeof this.stock === 'number') this.stock = Math.max(0, Math.round(this.stock));
```

با کامنت: «قیمت را گرد می‌کنیم تا اعشار سرگردان در پایگاه داده نماند.»
شرط `typeof === 'number'` در سطر آخر همان چیزی است که `null` را
دست‌نخورده می‌گذارد: «نامحدود» گِرد نمی‌شود.

**اهمیت این قلاب:** این قواعد در **لایهٔ مدل** هستند، نه در روت. یعنی
چه از `POST /api/items` بیاید، چه از `PUT`، چه از `seed.js`، همه اعمال
می‌شوند. به همین دلیل است که مسیر ویرایش عمداً `findByIdAndUpdate` را
استفاده نمی‌کند (که قلاب‌های سند را دور می‌زند) بلکه `findById` +
`Object.assign` + `save()` می‌نویسد.

---

## ۴.۵ مدل `Order` — سفارش به‌عنوان عکس لحظه‌ای

فایل: `server/src/models/Order.js` (۱۰۹ خط)

کامنت بالای فایل، فلسفهٔ طراحی را در چهار خط می‌گوید:

```js
/* سفارش‌ها. قیمت‌ها هنگام ثبت از روی پایگاه داده دوباره
   حساب می‌شوند (به عدد ارسالی از مرورگر اعتماد نمی‌کنیم)
   ولی همان لحظه در سفارش ذخیره می‌شوند تا تغییر قیمت
   بعدی، فاکتور قدیمی را عوض نکند. */
```

این دو جملهٔ به‌ظاهر متناقض، در واقع دو نگرانی جدا را حل می‌کنند:

- **«اعتماد نمی‌کنیم»** = مسئلهٔ امنیت. مشتری نمی‌تواند قیمت را دستکاری کند.
- **«ذخیره می‌شوند»** = مسئلهٔ درستی حسابداری. اگر فردا قیمت یرگاچف بالا
  برود، فاکتور دیروز نباید عوض شود.

### الف) ساختار سه‌لایهٔ تودرتو

```
Order
 └── lines[]           (lineSchema، بدون _id)
      └── mix[]        (mixSchema، بدون _id)
```

```js
const mixSchema = new mongoose.Schema(
  { slug: String, name: String, percent: Number },
  { _id: false }
);
```

توجه کنید که `name` هم ذخیره می‌شود. کامنت می‌گوید چرا:

> ترکیب میکس، همان‌طور که مشتری سفارش داده — با نام دانه‌ها، تا فاکتور
> بعداً هم خوانا بماند.

اگر فقط `slug` ذخیره می‌شد و مدیر بعداً نام «یرگاچف» را به «یرگاچف
اتیوپی» عوض می‌کرد یا کالا را حذف می‌کرد، فاکتور قدیمی `yirgacheffe` خام
نشان می‌داد.

### ب) `lineSchema`

```js
const lineSchema = new mongoose.Schema(
  {
    kind:      { type: String, required: true },
    slug:      { type: String, required: true },
    name:      { type: String, required: true },
    unitPrice: { type: Number, required: true },   // هر کیلو یا هر عدد
    grams:     { type: Number, default: 0 },       // قهوه و پودر
    qty:       { type: Number, default: 0 },       // ابزار
    lineTotal: { type: Number, required: true },

    grind:      { type: String, default: '' },
    grindLabel: { type: String, default: '' },

    mix: { type: [mixSchema], default: [] }
  },
  { _id: false }
);
```

نکتهٔ طراحی: `grams` و `qty` **هر دو** روی هر ردیف هستند، اما همیشه یکی
صفر است. برای کالای وزنی `qty = 0` و برای ابزار `grams = 0`. این باعث
می‌شود جمع‌زدن در aggregate ساده شود:

```js
// server/src/routes/stats.js
grams: { $sum: '$lines.grams' },
qty:   { $sum: '$lines.qty' },
```

بدون نیاز به `$cond`.

مشابهاً `grind` و `grindLabel` هر دو ذخیره می‌شوند: `grind` کلید ماشینی
(`'espresso'`) و `grindLabel` متن فارسی همان لحظه (`'آسیاب اسپرسو'`).
اگر مدیر بعداً برچسب را عوض کند، سفارش قدیمی همان چیزی را نشان می‌دهد که
مشتری دیده بود.

### ج) تولید شمارهٔ سفارش

```js
orderSchema.pre('validate', function (next) {
  if (!this.code) {
    const stamp = Date.now().toString(36).slice(-4).toUpperCase();
    const rand = Math.floor(Math.random() * 9000 + 1000);
    this.code = `${stamp}-${rand}`;
  }
  next();
});
```

خط‌به‌خط:

- `Date.now()` → عدد میلی‌ثانیه، مثلاً `1754906421337`
- `.toString(36)` → مبنای ۳۶ (رقم + حرف)، مثلاً `'1jkm3p9pt'`
- `.slice(-4)` → چهار نویسهٔ آخر، `'9pt'`... در واقع `'p9pt'`
- `.toUpperCase()` → `'P9PT'`
- `rand` عددی بین ۱۰۰۰ و ۹۹۹۹

نتیجه: `P9PT-8412`. کوتاه، خواناتر از `ObjectId` بیست‌وچهار نویسه‌ای، و
قابل خواندن روی تلفن.

> **هشدار**
> این تولیدکننده **قطعاً یکتا نیست**. فیلد `code` قید `unique` دارد، پس
> برخورد باعث خطای `11000` می‌شود که به پیام «این شمارهٔ سفارش قبلاً
> استفاده شده است» تبدیل می‌شود — و **هیچ منطق تلاش مجددی وجود ندارد**.
> احتمالش کم است (نیاز به دو سفارش در یک بازهٔ ۳۶ˆ۴ میلی‌ثانیه‌ای با
> همان عدد تصادفی) اما صفر نیست. در فصل ۱۱ راه‌حلش را می‌آوریم.

### د) `totals` — چرا ذخیره می‌شود؟

```js
totals: {
  grams:         { type: Number, default: 0 },
  pieces:        { type: Number, default: 0 },
  base:          { type: Number, default: 0 },
  discount:      { type: Number, default: 0 },
  discountLabel: { type: String, default: '' },
  shipping:      { type: Number, default: 0 },
  total:         { type: Number, default: 0 }
}
```

این‌ها همه از `lines` قابل محاسبه‌اند، پس **داده‌های اضافه (denormalized)**
هستند. دلیلش کارایی گزارش‌ها است. در `server/src/routes/reports.js`:

```js
const rows = await Order.find(
  { createdAt: { $gte: windowStart } },
  { createdAt: 1, status: 1, totals: 1 }     // ← projection سبک
).lean();
```

اگر `totals` ذخیره نمی‌شد، برای هر گزارش باید همهٔ `lines` خوانده و
دوباره جمع زده می‌شدند. با این طراحی، گزارش ماهانه فقط سه فیلد کوچک از
هر سفارش می‌خواند.

همچنین `discountLabel` (رشتهٔ `'۱۵٪'`) ذخیره می‌شود تا اگر فردا پله‌های
تخفیف عوض شوند، فاکتور قدیمی همان درصدی را نشان دهد که واقعاً اعمال شده
بود.

---

## ۴.۶ مدل `Admin`

```js
const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String, required: [true, 'نام کاربری الزامی است'],
      unique: true, trim: true, lowercase: true,
      minlength: [3, 'نام کاربری دست‌کم ۳ نویسه باشد']
    },
    passwordHash: { type: String, required: true, select: false },
    tokenVersion: { type: Number, default: 0 }
  },
  {
    timestamps: true,
    toJSON: { transform(_d, ret) { delete ret.passwordHash; delete ret.__v; return ret; } }
  }
);
```

**سه لایهٔ محافظت از رمز:**

۱) `select: false` — در کوئری معمولی اصلاً خوانده نمی‌شود. برای خواندنش
   باید صریحاً بخواهید:
   ```js
   const admin = await Admin.findOne({ username }).select('+passwordHash');
   ```

۲) `toJSON.transform` — حتی اگر خوانده شد، در سریال‌سازی حذف می‌شود.

۳) هیچ‌وقت رمز خام ذخیره نمی‌شود:
   ```js
   adminSchema.methods.setPassword = async function (plain) {
     this.passwordHash = await bcrypt.hash(plain, 12);
   };
   adminSchema.methods.checkPassword = function (plain) {
     return bcrypt.compare(plain, this.passwordHash);
   };
   ```

`lowercase: true` روی `username` یعنی `Admin` و `admin` یکی‌اند — و در
مسیر ورود هم `String(req.body.username).trim().toLowerCase()` اعمال
می‌شود، پس نگاشت یک‌به‌یک است.

---

## ۴.۷ مدل `ClubMember`

```js
phone: {
  type: String,
  required: [true, 'شمارهٔ موبایل را وارد کنید'],
  unique: true,
  trim: true,
  match: [/^0\d{10}$/, 'شمارهٔ موبایل باید ۱۱ رقم و با ۰ شروع شود']
},

email: {
  type: String, default: '', trim: true, lowercase: true,
  validate: {
    validator: (v) => v === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
    message: 'ایمیل معتبر نیست'
  }
}
```

دو نکته:

**۱) `phone` کلید یکتای طبیعی است.** چون رمز عبوری در کار نیست، شماره
همان هویت است. مسیر عضویت به‌جای خطا دادن، **به‌روزرسانی** می‌کند:

```js
const existing = await ClubMember.findOne({ phone });
if (existing) {
  existing.name = name;
  if (email) existing.email = email;
  if (taste) existing.taste = taste;
  existing.active = true;
  await existing.save();
  return res.json({ ok: true, already: true, name: existing.name });
}
```

کامنت: «اگر قبلاً عضو شده، اطلاعاتش را تازه می‌کنیم و همان پیام خوشامد
را می‌دهیم — نه پیام خطا.» و کلاینت از `already` استفاده می‌کند تا پیام
مناسب نشان دهد.

**۲) اعتبارسنجی ایمیل با `v === ''` شروع می‌شود** — چون ایمیل اختیاری
است و رشتهٔ خالی باید بگذرد، اما اگر چیزی نوشته شد باید معتبر باشد.

ایندکس `clubSchema.index({ createdAt: -1 })` برای مرتب‌سازی «تازه‌ترین
اول» در پنل است.

---

## ۴.۸ مدل `Content` — الگوی کلید/مقدار

```js
const contentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true, minimize: false,
    toJSON: { transform(_d, ret) { delete ret.__v; return ret; } } }
);
```

**`Mixed` یعنی Mongoose هیچ اعتبارسنجی روی `data` انجام نمی‌دهد.**
کامنت این را عمدی نشان می‌دهد:

> ساختارش به کلید بستگی دارد؛ اعتبارسنجی شکل داده در لایهٔ مسیرها انجام
> می‌شود، نه اینجا.

**`minimize: false` نکتهٔ ظریفی است.** به‌طور پیش‌فرض Mongoose شیءهای خالی
(`{}`) را از سند حذف می‌کند. اگر مدیر همهٔ فیلدهای یک بخش را خالی کند،
بدون این تنظیم آن کلید از سند ناپدید می‌شد و بخش به پیش‌فرض برمی‌گشت —
که رفتار گیج‌کننده‌ای بود.

### هفت کلید و شکل داده‌شان

| `key` | شکل `data` | مصرف‌کننده |
|---|---|---|
| `whyUs` | `{eyebrow, title, lead, reasons:[{icon,title,text}], ctaText, ctaHref}` | `WhyUsSection` |
| `suggest` | `{eyebrow, title, lead, profiles:[{key,label,hint,advice,picks:[slug]}]}` | `SuggestSection` |
| `picks` | `{eyebrow, title, lead, featuredTitle, featuredNote, topTitle, topNote, emptyTop}` | `PicksSections` |
| `blends` | `{eyebrow, title, lead, customNote}` | `BlendsSection` |
| `club` | `{eyebrow, title, lead, benefits:[String], successTitle, successText, askTaste, askEmail}` | `ClubSection` |
| `about` | `{eyebrow, title, lead, image, imageCaption, facts:[{value,label}], sections:[{title,text}], addressTitle, address, hours, phone, email}` | `AboutSection` + رسید |
| `grinds` | `{options:[{value,label,desc}]}` | کارت قهوه، سبد، سرور |

### تابع کمکی `loadContent`

```js
export async function loadContent() {
  const rows = await Content.find().lean();
  return Object.fromEntries(rows.map((r) => [r.key, r.data]));
}
```

آرایهٔ اسناد را به یک شیء تخت تبدیل می‌کند: `{whyUs: {...}, about: {...}}`.

### سازوکار fallback

در `server/src/routes/content.js`:

```js
const KEYS = Object.keys(DEFAULT_CONTENT);

router.get('/', async (_req, res, next) => {
  const stored = await loadContent();
  const out = {};
  for (const key of KEYS) {
    out[key] = stored[key] !== undefined ? stored[key] : DEFAULT_CONTENT[key];
  }
  res.json(out);
});
```

سه فایده:
- **سایت هیچ‌وقت با بخش خالی بالا نمی‌آید** حتی اگر seed اجرا نشده باشد.
- `KEYS` از `DEFAULT_CONTENT` مشتق می‌شود، پس **whitelist خودکار** است:
  مسیر `PUT /:key` هر کلید ناشناسی را رد می‌کند.
- اضافه کردن بخش تازه فقط یعنی یک کلید به `DEFAULT_CONTENT` و یک ورودی
  به `contentSchema.js` — بدون مهاجرت پایگاه داده.

---

## ۴.۹ چرا `slug` و نه `ObjectId`؟

فیلد `slug` در این پروژه **چهار نقش همزمان** دارد:

۱) **شناسهٔ خوانا** — `yirgacheffe` به‌جای `66b2f1e8a4c9d20012ab34ef`.

۲) **بذر تولید تصویر** — در `web/src/lib/art.js`:
   ```js
   const rnd = seeded(p.slug);
   const uid = 'k' + p.slug.replace(/[^a-z0-9]/gi, '');
   ```
   کامنت مدل هم این را می‌گوید: «شناسهٔ انگلیسی و یکتا — هم در آدرس‌ها
   استفاده می‌شود و هم بذر تولید تصویر کارت است، پس نباید تکراری باشد.»

۳) **کلید میکس** — `components[].slug` و `pool[]`.

۴) **کلید سفارش** — `lines[].slug` و `mix[].slug`.

قید فرمت آن سخت‌گیرانه است:

```js
match: [/^[a-z0-9][a-z0-9-]*$/, 'شناسه فقط می‌تواند حروف کوچک انگلیسی، عدد و خط تیره باشد']
```

باید با حرف یا رقم شروع شود (نه خط تیره)، و فقط حروف کوچک لاتین، رقم و
خط تیره. این تضمین می‌کند که `uid` تولیدشده در SVG یک شناسهٔ معتبر باشد.

برای راحتی مدیر، فرم کالا یک مبدل حرف‌نویسی فارسی به لاتین دارد
(`suggestSlug` در `AdminItemForm.jsx`):

```js
const map = { 'ا':'a','آ':'a','ب':'b','پ':'p','ت':'t', ... 'ی':'y',' ':'-','‌':'-' };
return [...String(name).toLowerCase()]
  .map((ch) => (/[a-z0-9]/.test(ch) ? ch : map[ch] ?? ''))
  .join('').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
```

توجه کنید که `'‌'` (نیم‌فاصله، U+200C) هم در نگاشت هست و به خط تیره
تبدیل می‌شود — جزئیاتی که فقط کسی که با متن فارسی کار کرده به آن فکر
می‌کند.

### هزینهٔ این انتخاب

بدون یکپارچگی ارجاعی، سه محافظ دستی لازم شده:

**۱) هنگام ذخیرهٔ میکس** (`routes/items.js` → `checkBlend`):
```js
if (slugs.includes(selfSlug)) return 'یک میکس نمی‌تواند خودش را به‌عنوان جزء داشته باشد';
if (!bean) return `دانهٔ «${s}» پیدا نشد — فقط قهوه‌ها را می‌شود در میکس گذاشت`;
if (bean.isBlend) return `«${s}» خودش یک میکس است و نمی‌تواند جزء میکس دیگری باشد`;
```

**۲) هنگام ثبت سفارش** (`routes/orders.js`) — همان بررسی‌ها دوباره روی
ترکیب ارسالی مشتری.

**۳) هنگام بارگذاری سبد** (`ShopContext.jsx`):
```js
const kept = prev.filter(
  (l) => bySlug.has(l.slug) && (l.mix || []).every((m) => bySlug.has(m.slug))
);
```
کامنت: «اگر مدیر کالایی را پاک یا خاموش کند، ردیفش از سبد کاربر هم
برداشته می‌شود تا موقع ثبت سفارش خطا نگیرد.»

---

## ۴.۱۰ دادهٔ اولیه

### توزیع ۱۰۶ کالا

**۳۲ قهوه** بر اساس `group`:

| دسته | تعداد | نمونه |
|---|---|---|
| `light` | ۸ | یرگاچف، گوجی، کنیا AA، گیشا پاناما |
| `medium` | ۱۱ | هویلا، آنتیگوا، سرادو، بلو مانتین |
| `dark` | ۶ | سوماترا مندلینگ، مونسون مالابار، رست فرانسوی |
| `espresso` | ۵ | میکس ۷۰/۳۰، ۱۰۰٪ عربیکا، شب‌نشین، کلد برو |
| `decaf` | ۲ | کلمبیا بدون کافئین، اسپرسو بدون کافئین |

**۴۰ ابزار** در شش دسته و **۳۴ پودر** در شش دسته.

بازهٔ قیمت جالب است: از ۲۹۰٬۰۰۰ تومان (لیوان کورتادو) تا ۹۶٬۰۰۰٬۰۰۰
تومان (ماشین اسپرسو تک‌گروپ E61) و در قهوه‌ها از ۸۲۰٬۰۰۰ (میکس ۵۰/۵۰)
تا ۸٬۵۰۰٬۰۰۰ (بلو مانتین) تومان هر کیلو.

### پنج میکس اولیه

از `server/src/data/seed-enrich.js`:

| `slug` | ترکیب پیشنهادی | دستمزد میکس |
|---|---|---|
| `espresso-70-30` | سرادو ۷۰٪ + مونسون ۳۰٪ | ۴۰٬۰۰۰ |
| `espresso-100` | سرادو ۴۰٪ + هویلا ۳۵٪ + یرگاچف ۲۵٪ | ۵۰٬۰۰۰ |
| `espresso-50-50` | سرادو ۵۰٪ + مونسون ۵۰٪ | ۳۵٬۰۰۰ |
| `shabneshin` | هویلا ۴۵٪ + سرادو ۳۵٪ + بوگیسو ۲۰٪ | ۴۵٬۰۰۰ |
| `cold-brew` | سرادو ۶۰٪ + سیدامو ۴۰٪ | ۴۰٬۰۰۰ |

هر پنج تا `house: true` و `customizable: true` هستند.

### الگوریتم seed

فایل `server/src/seed.js` پنج مرحله دارد و ترتیبشان مهم است:

```js
await seedItems();       // ۱) کالاها + متن + برچسب طعمی
await enrichExisting();  // ۲) پر کردن فیلدهای خالی کالاهای قدیمی
await seedBlends();      // ۳) پیکربندی میکس‌ها ← بعد از ساخته شدن دانه‌ها
await seedContent();     // ۴) متن‌های سایت
await seedAdmin();       // ۵) حساب مدیر
```

کامنت `seedBlends` دلیل ترتیب را می‌گوید: «میکس‌ها بعد از ساخته شدن همهٔ
قهوه‌ها تنظیم می‌شوند، چون اجزای‌شان باید از قبل وجود داشته باشند.»

و `seedBlends` هوشمندانه فقط دانه‌های موجود را نگه می‌دارد:

```js
const beans = await Item.find({
  slug: { $in: [...blend.components.map((c) => c.slug), ...(blend.pool || [])] }
}).select('slug').lean();
const have = new Set(beans.map((b) => b.slug));

const components = blend.components.filter((c) => have.has(c.slug));
if (components.length < 2) continue;    // ← میکس ناقص را رها می‌کند
```

**ویژگی کلیدی: غیرمخرب بودن.** بدون `--reset`:

```js
const exists = await Item.exists({ slug: data.slug });
if (exists) { skipped++; continue; }
```

و در `enrichExisting`:

```js
for (const field of ['story', 'taste', 'recommend']) {
  if (!item[field] && story[field]) { item[field] = story[field]; changed = true; }
}
```

فقط اگر فیلد **خالی** باشد پر می‌شود. یعنی می‌توانید بارها `npm run seed`
بزنید بدون اینکه ویرایش‌هایتان از بین برود.

---

## ۴.۱۱ داده‌های سمت مرورگر

دو چیز در `localStorage` نگه داشته می‌شوند:

| کلید | محتوا | خوانده و نوشته می‌شود در |
|---|---|---|
| `ghahve.cart` | آرایهٔ ردیف‌های سبد | `lib/cartStorage.js`، از راه `ShopContext` |
| `ghahve.admin.token` | JWT مدیر | `lib/api.js` |

شکل هر ردیف سبد:

```js
{
  key:   'espresso-70-30|espresso|cerrado:60,monsooned:40',
  slug:  'espresso-70-30',
  kind:  'coffee',
  grams: 500,
  qty:   0,
  grind: 'espresso',
  mix:   [{ slug: 'cerrado', percent: 60 }, { slug: 'monsooned', percent: 40 }]
}
```

توجه کنید که **قیمت ذخیره نمی‌شود**. قیمت هر بار از روی کالاهای تازه
از سرور محاسبه می‌شود، پس اگر مدیر قیمت را عوض کند، سبد کاربر خودکار
به‌روز می‌شود.

خواندن سبد با بی‌اعتمادی کامل انجام می‌شود — و از **مورد ۲۶** به بعد،
بیرون از کامپوننت. منطقش به `web/src/lib/cartStorage.js` منتقل شد و
حافظه به‌شکل پارامتر تزریق می‌شود:

```js
export function parseCart(raw) {
  let data;
  try { data = JSON.parse(raw || '[]'); } catch { return []; }
  if (!Array.isArray(data)) return [];

  return data
    .filter((l) => l && typeof l.slug === 'string')
    .map((l) => ({
      /* شناسه از نو ساخته می‌شود، نه از فایل خوانده —
         وگرنه ردیفی با شناسهٔ جعلی می‌توانست با ردیف
         دیگری قاطی شود. */
      key: lineKey(l.slug, grind, mix),
      slug: l.slug, kind: l.kind,
      grams: Number(l.grams) || 0, qty: Number(l.qty) || 0,
      grind, mix
    }));
}

export function loadCart(storage) {
  if (!storage) return [];
  try { return parseCart(storage.getItem(CART_KEY)); } catch { return []; }
}

export const browserStorage = () =>
  typeof window === 'undefined' ? null : window.localStorage;
```

دو چیز در این جابه‌جایی عوض شد و هر دو به رندر سمت سرور برمی‌گردند:

**یک) روی سرور `localStorage` وجود ندارد.** `browserStorage()` آنجا
`null` می‌دهد و `loadCart` سبد خالی برمی‌گرداند — بی هیچ خطایی.

**دو) ترتیب حالا حساس است.** اگر پیش از خوانده شدنِ سبدِ ذخیره‌شده چیزی
نوشته شود، سبد مشتری با یک آرایهٔ خالی پاک می‌شود. برای همین
`ShopContext` یک پرچم `hydrated` دارد و نوشتن پشت آن است. شرحش در
بخش ۷.۱۲ آمده و `tests/cart-hydration.test.jsx` نگهبانش است.

کامنت بالای فایل: «سبد ذخیره‌شده را می‌خوانیم ولی به آن اعتماد نمی‌کنیم؛
هرچه در `localStorage` است دستِ کاربر بوده. پس هر ردیف از نو ساخته
می‌شود.» ردیف‌هایی که کالایشان دیگر وجود ندارد بعد از رسیدن فهرست کالاها
پاک می‌شوند — با دو نگهبان، که در ۷.۱۲ توضیح داده شده‌اند.

قیمت اینجا هم ذخیره نمی‌شود: تنها چیزی که در حافظه می‌ماند شناسه و مقدار
و ترکیب است.

---

## ۴.۱۲ جمع‌بندی الگوهای داده‌ای

| الگو | جا | چرا |
|---|---|---|
| **Single-table inheritance** | `Item` با `kind` | یک UI و یک API برای سه نوع |
| **Embedded subdocument** | `components`، `lines`، `mix` | همیشه با والد خوانده می‌شوند |
| **Snapshot / point-in-time** | `Order.lines[].name/unitPrice/grindLabel` | فاکتور نباید با تغییر کالا عوض شود |
| **Denormalization** | `Order.totals` | گزارش‌ها بدون خواندن ردیف‌ها |
| **Key–value با schema بیرونی** | `Content` | افزودن بخش بدون مهاجرت |
| **کلید طبیعی به‌جای کلید مصنوعی** | `Item.slug`، `ClubMember.phone` | خوانایی و نقش چندگانه |
| **Soft delete نمایشی** | `Item.active` | پنهان کردن بدون از دست دادن تاریخچه |
| **Optimistic token invalidation** | `Admin.tokenVersion` | ابطال بدون جدول blacklist |
| **سه‌حالتی با `null`** | `Item.stock` | «نشمرده»، «مانده» و «تمام شد» سه چیز جدا هستند |
| **رزرو اتمی** | `findOneAndUpdate` با شرط `$gte` | فروش بیش از موجودی از اساس ممکن نیست |
