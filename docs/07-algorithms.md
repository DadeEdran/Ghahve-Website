# ۷. الگوریتم‌ها و منطق تجاری

این فصل هر الگوریتم غیرپیش‌پاافتادهٔ پروژه را با تکه‌کد واقعی و توضیح
خط‌به‌خط بررسی می‌کند.

---

## ۷.۰ کدام الگوریتم کجا اجرا می‌شود

پیش از هر چیز، یک نقشه. با مورد ۲۶ پرسشِ «این کد کجا اجرا می‌شود؟» سه
جواب پیدا کرد، نه دو تا — و برای خواندن بقیهٔ فصل لازم است بدانید هر
تابع در کدام ستون می‌نشیند.

| اجرا می‌شود در | یعنی چه | چه چیزی آنجاست |
|---|---|---|
| **فرآیند Express** | نود، با دسترسی مستقیم به مونگو | `jalali.js`، `stock.js`، `track.js`، `cors.js`، `siteUrl.js`، روترها، قلاب‌های مدل |
| **فرآیند Next، روی سرور** | نود، بدون مونگو — از راه API می‌خواند | کامپوننت‌های سروری `app/**`، `lib/data.js`، `lib/metadata.js`، `lib/seo.js`، و `art.js` هنگام رندر اولیه |
| **مرورگر** | بعد از hydrate | `ShopContext`، `blend.js`، `blendVisual.js`، `cartStorage.js`، `useReveal.js`، و همهٔ رویدادها |

و **بستهٔ مشترک در هر سه اجرا می‌شود**. این تازه است: پیش از مهاجرت،
`pricing.js` دو مصرف‌کننده داشت (مرورگر و Express)؛ حالا سه تا.

| فایل shared | در Express | در Next روی سرور | در مرورگر |
|---|---|---|---|
| `pricing.js` | بازمحاسبهٔ قطعیِ سفارش | قیمت کارت‌ها و جمع سبد در اولین رندر | همان جمع، زنده با هر کلیک |
| `taxonomy.js` | اعتبارسنجی مدل `Item` | برچسب‌ها هنگام رندر کارت | همان، در تعامل |
| `seo.js` | `sitemap.xml` و `robots.txt` | `generateMetadata`، JSON-LD، `itemPath` | فقط `itemPath` برای لینک کارت‌ها |

سه نتیجهٔ عملی از این جدول:

**۱) هیچ‌کدام از این فایل‌ها اجازه ندارند به `window` یا به مونگوس دست
بزنند.** توابع خالص‌اند و همین است که اجازه می‌دهد در هر سه محیط اجرا
شوند. `siteBaseUrl` در `web/src/lib/site.js` تنها جایی است که `window`
را نگاه می‌کند، و صریحاً `typeof window === 'undefined'` را می‌سنجد.

**۲) قیمتی که مشتری می‌بیند حالا دو بار پیش از ثبت حساب می‌شود** — یک
بار روی سرور موقع ساختن HTML، یک بار در مرورگر بعد از hydrate — و هر دو
باید **یک عدد** بدهند، وگرنه ری‌اکت ناسازگاری می‌بیند. چون
`computeTotals` تابع خالص است و ورودی‌اش در هر دو یکی است، می‌دهند.

> **نکته**
> یک استثنا هست: «پیشنهاد روز» با `Date.now()` انتخاب می‌شود و تنها
> محاسبهٔ پروژه است که به لحظهٔ اجرا وابسته است. جزئیاتش در ۷.۱۱.

**۳) بازمحاسبهٔ سمت سرور سر جایش هست.** هیچ‌کدام از این دو محاسبه جای
`computeTotals` در `routes/orders.js` را نمی‌گیرد. سرور همچنان کالاها را
از پایگاه داده می‌خواند و قیمت را از نو حساب می‌کند — یکی بودنِ فرمول
فقط تضمین می‌کند نتیجه با آنچه کاربر دیده یکی دربیاید.

---

## ۷.۱ محاسبهٔ قیمت — `shared/pricing.js`

یک فایل، در بستهٔ مشترک `@ghahve/shared`. هم مرورگر و هم سرور همین را
import می‌کنند:

```js
import { computeTotals, lineTotal, unitPriceFor } from '@ghahve/shared/pricing.js';
```

پیش از این دو نسخهٔ آینه‌ای وجود داشت (یکی در client، یکی در server) که
باید دستی همگام می‌ماندند؛ حالا واگرایی از اساس ممکن نیست. این جای
بازمحاسبهٔ سمت سرور را نمی‌گیرد — سرور همچنان به عددِ ارسالی از مرورگر
اعتماد نمی‌کند — فقط تضمین می‌کند نتیجه با آنچه کاربر دیده یکی دربیاید.

<!--DIAGRAM:pricing-->

### ثابت‌ها

```js
export const TIERS = [
  { min: 5000, rate: 0.15, label: '۱۵٪' },
  { min: 3000, rate: 0.10, label: '۱۰٪' },
  { min: 1000, rate: 0.05, label: '۵٪'  },
  { min: 0,    rate: 0,    label: ''    }
];

export const SHIPPING = 65000;            // تومان
export const FREE_SHIPPING_FROM = 1000;   // گرم
```

**چرا ترتیب نزولی؟** چون بعداً با `.find()` جست‌وجو می‌شود:

```js
const tier = TIERS.find((t) => grams >= t.min);
```

`Array.prototype.find` **اولین** تطبیق را برمی‌گرداند. با ترتیب نزولی،
اولین تطبیق همیشه بالاترین پلهٔ واجد شرایط است. با ۳۵۰۰ گرم:
`3500 >= 5000`؟ نه. `3500 >= 3000`؟ بله → ۱۰٪.

و ردیف `{min: 0, rate: 0}` نقش `else` را بازی می‌کند: `.find()` هیچ‌وقت
`undefined` برنمی‌گرداند، پس نیازی به بررسی `null` نیست.

### تابع `priceFor`

```js
/** قیمت را به نزدیک‌ترین ۱۰۰۰ تومان گرد می‌کند */
export const priceFor = (pricePerKg, grams) =>
  Math.round((pricePerKg * grams) / 1000 / 1000) * 1000;
```

سه عملیات در یک خط:

| مرحله | عملیات | مثال (`۱۸۵۰۰۰۰` تومان/کیلو، `۲۵۰` گرم) |
|---|---|---|
| ۱ | `pricePerKg * grams` | `۱۸۵۰۰۰۰ × ۲۵۰ = ۴۶۲٬۵۰۰٬۰۰۰` |
| ۲ | `/ 1000` (گرم → کیلو) | `۴۶۲٬۵۰۰` |
| ۳ | `/ 1000` ... `* 1000` | `round(۴۶۲٫۵) = ۴۶۳` → `۴۶۳٬۰۰۰` |

نتیجه: **۴۶۳٬۰۰۰ تومان**.

آن `/1000 ... *1000` تکنیک استاندارد گرد کردن به مضرب است. عبارت
`Math.round(x / n) * n` عدد را به نزدیک‌ترین مضرب `n` می‌برد.

**چرا گرد کردن؟** قهوه به گرم فروخته می‌شود و ضرب‌های اعشاری اجتناب‌ناپذیر
است. عدد `۴۶۲٬۵۰۰` برای فاکتور دستی و پرداخت نقدی ناخوشایند است؛
`۴۶۳٬۰۰۰` نیست.

> **نکته**
> این گرد کردن **رو به بالا و پایین** است (`Math.round`)، نه همیشه بالا.
> پس گاهی به نفع مشتری و گاهی به نفع فروشنده است. فروشگاهی که همیشه رو
> به بالا گرد می‌کند از `Math.ceil` استفاده می‌کرد.

### تابع `blendPricePerKg` — قیمت میکس

```js
export function blendPricePerKg(item, mix, lookup) {
  const parts = Array.isArray(mix) && mix.length ? mix : item.components || [];
  if (!parts.length) return item.price;

  let total = 0;
  let percentSum = 0;

  for (const p of parts) {
    const bean = lookup(p.slug);
    if (!bean) return item.price;        // ترکیب ناقص — به قیمت پایه برگرد
    const percent = Number(p.percent) || 0;
    total += bean.price * percent;
    percentSum += percent;
  }

  if (percentSum <= 0) return item.price;

  /* percentSum معمولاً ۱۰۰ است؛ تقسیم بر خودش یعنی اگر
     کمی کمتر یا بیشتر بود هم نتیجه معنی‌دار بماند. */
  const weighted = total / percentSum;
  return Math.round((weighted + (item.surcharge || 0)) / 1000) * 1000;
}
```

**خط ۲:** اگر ترکیب دلخواه داده شده، همان؛ وگرنه ترکیب رسمی کالا.
این همان چیزی است که به کارت کالا اجازه می‌دهد قیمت رسمی را نشان دهد و
به ساز میکس اجازه می‌دهد قیمت زندهٔ ترکیب کاربر را.

**خط ۳ و ۱۱ و ۱۷ — سه fallback امن.** هر سه به `item.price` برمی‌گردند:
- ترکیب خالی است
- یکی از دانه‌ها پیدا نشد (مثلاً مدیر حذفش کرده)
- مجموع درصدها صفر یا منفی است

نتیجه: **هیچ‌وقت `NaN` یا `Infinity` روی صفحه نمی‌آید.**

**خط ۱۹ — چرا تقسیم بر `percentSum` و نه بر ۱۰۰؟**

فرض کنید به‌خاطر گرد شدن، مجموع ۹۹ شده باشد:

```
سرادو    ۶۶٪ × ۱٬۲۰۰٬۰۰۰ =  ۷۹٬۲۰۰٬۰۰۰
مونسون   ۳۳٪ × ۱٬۴۸۰٬۰۰۰ =  ۴۸٬۸۴۰٬۰۰۰
                    total = ۱۲۸٬۰۴۰٬۰۰۰
```

- تقسیم بر ۱۰۰: `۱٬۲۸۰٬۴۰۰` ← ۱٪ قیمت گم شده
- تقسیم بر ۹۹: `۱٬۲۹۳٬۳۳۳` ← میانگین وزنی درست

با تقسیم بر مجموع واقعی، **نسبت‌ها حفظ می‌شوند** حتی اگر جمع دقیقاً ۱۰۰
نباشد.

### مثال کامل

میکس `espresso-70-30` با ترکیب پیش‌فرض:

```
سرادو    ۷۰٪ × ۱٬۲۰۰٬۰۰۰ = ۸۴٬۰۰۰٬۰۰۰
مونسون   ۳۰٪ × ۱٬۴۸۰٬۰۰۰ = ۴۴٬۴۰۰٬۰۰۰
                   total = ۱۲۸٬۴۰۰٬۰۰۰
              percentSum = ۱۰۰

weighted  = ۱۲۸٬۴۰۰٬۰۰۰ / ۱۰۰ = ۱٬۲۸۴٬۰۰۰
surcharge = ۴۰٬۰۰۰
جمع       = ۱٬۳۲۴٬۰۰۰
گرد       = round(۱۳۲۴) × ۱۰۰۰ = ۱٬۳۲۴٬۰۰۰ تومان هر کیلو
```

حالا اگر مشتری روبوستا را به ۶۰٪ ببرد:

```
سرادو    ۴۰٪ × ۱٬۲۰۰٬۰۰۰ = ۴۸٬۰۰۰٬۰۰۰
مونسون   ۶۰٪ × ۱٬۴۸۰٬۰۰۰ = ۸۸٬۸۰۰٬۰۰۰
                   total = ۱۳۶٬۸۰۰٬۰۰۰
weighted  = ۱٬۳۶۸٬۰۰۰ + ۴۰٬۰۰۰ = ۱٬۴۰۸٬۰۰۰ تومان هر کیلو
```

قیمت **همان لحظه** روی کارت عوض می‌شود.

### تابع `unitPriceFor`

```js
export function unitPriceFor(line, lookup) {
  if (line.item.isBlend && lookup) {
    return blendPricePerKg(line.item, line.mix, lookup);
  }
  return line.item.price;
}
```

یک لایهٔ نازک تصمیم‌گیری: میکس → محاسبه، غیرمیکس → قیمت ثابت.
شرط `&& lookup` محافظ است برای وقتی که تابع بدون lookup صدا زده شود.

### تابع `computeTotals` — قلب سبد

```js
export function computeTotals(lines, lookup) {
  let grams = 0, pieces = 0;
  let weighedBase = 0, gearBase = 0;

  for (const l of lines) {
    if (l.kind === 'gear') {
      pieces += l.qty;
      gearBase += l.item.price * l.qty;
    } else {
      grams += l.grams;
      weighedBase += priceFor(unitPriceFor(l, lookup), l.grams);
    }
  }

  const base = weighedBase + gearBase;
  const tier = TIERS.find((t) => grams >= t.min);
  const discount = Math.round((weighedBase * tier.rate) / 1000) * 1000;
  const shipping = lines.length === 0 ? 0 : grams >= FREE_SHIPPING_FROM ? 0 : SHIPPING;

  return {
    grams, pieces, base, discount,
    discountLabel: tier.label,
    shipping,
    total: base - discount + shipping
  };
}
```

**چهار انباشتگر جدا** نگه داشته می‌شوند: `grams`, `pieces`,
`weighedBase`, `gearBase`. دلیلش سه قاعدهٔ تجاری متفاوت است:

**قاعدهٔ ۱ — تخفیف فقط روی کالای وزنی.**

```js
const discount = Math.round((weighedBase * tier.rate) / 1000) * 1000;
```

توجه: `weighedBase` نه `base`. اگر مشتری ۵ کیلو قهوه (۶ میلیون تومان) و
یک آسیاب ۷٬۸۰۰٬۰۰۰ تومانی بخرد، ۱۵٪ فقط روی ۶ میلیون اعمال می‌شود، نه
روی ۱۳٫۸ میلیون.

متن سایت هم این را صریح می‌گوید (در `HomeShell.jsx`، توضیح بخش ابزار):

> قیمت این‌ها به ازای هر عدد است و تخفیف پلکانی فقط روی کالاهای وزنی
> (قهوه و پودر) اعمال می‌شود.

**قاعدهٔ ۲ — آستانهٔ تخفیف بر پایهٔ وزن است، نه پول.**

```js
const tier = TIERS.find((t) => grams >= t.min);
```

خرید ۸٬۵۰۰٬۰۰۰ تومان بلو مانتین در ۱۰۰ گرم، **هیچ تخفیفی نمی‌گیرد**.
خرید ۱ کیلو میکس ۵۰/۵۰ به قیمت ۸۲۰٬۰۰۰ تومان، ۵٪ می‌گیرد.

این تصمیم با مدل کسب‌وکار جور است: تخفیف حجمی برای صرفه‌جویی در رست و
بسته‌بندی است، نه پاداش خرید گران.

**قاعدهٔ ۳ — ارسال هم بر پایهٔ وزن.**

```js
const shipping = lines.length === 0 ? 0 : grams >= FREE_SHIPPING_FROM ? 0 : SHIPPING;
```

سه حالت:
- سبد خالی → صفر (تا در سبد خالی «۶۵٬۰۰۰ تومان ارسال» نشان داده نشود)
- وزن ≥ ۱۰۰۰ گرم → رایگان
- وگرنه → ۶۵٬۰۰۰

> **هشدار: یک لبهٔ تیز**
> سبدی که **فقط ابزار** دارد (`grams === 0`) همیشه ۶۵٬۰۰۰ تومان ارسال
> می‌دهد — حتی اگر یک ماشین اسپرسو ۹۶ میلیون تومانی باشد. طبق کد این
> رفتار عمدی به نظر می‌رسد (چون شرط بر پایهٔ `grams` است) اما احتمالاً
> در عمل باید بازبینی شود.

**قاعدهٔ ۴ — تخفیف هم گرد می‌شود.**

```js
Math.round((weighedBase * tier.rate) / 1000) * 1000
```

پس مبلغ تخفیف هم عددی گرد است و فاکتور نهایی هیچ اعشاری ندارد.

### تابع `lineTotal`

```js
export function lineTotal(l, lookup) {
  return l.kind === 'gear'
    ? l.item.price * l.qty
    : priceFor(unitPriceFor(l, lookup), l.grams);
}
```

برای نمایش قیمت هر ردیف و ذخیره در `Order.lines[].lineTotal`.

### مثال کامل سبد

```
ردیف ۱: یرگاچف، ۵۰۰ گرم، هر کیلو ۱٬۸۵۰٬۰۰۰
        priceFor(1850000, 500) = round(925) × 1000 = ۹۲۵٬۰۰۰

ردیف ۲: میکس ۷۰/۳۰ با نسبت ۵۰/۵۰، ۷۰۰ گرم
        blendPricePerKg = (1200000×50 + 1480000×50)/100 + 40000
                        = ۱٬۳۴۰٬۰۰۰ + ۴۰٬۰۰۰ = ۱٬۳۸۰٬۰۰۰
        priceFor(1380000, 700) = round(966) × 1000 = ۹۶۶٬۰۰۰

ردیف ۳: قیف وی۶۰، ۲ عدد × ۱٬۲۸۰٬۰۰۰ = ۲٬۵۶۰٬۰۰۰

─────────────────────────────────────────────
grams       = ۵۰۰ + ۷۰۰ = ۱۲۰۰
pieces      = ۲
weighedBase = ۹۲۵٬۰۰۰ + ۹۶۶٬۰۰۰ = ۱٬۸۹۱٬۰۰۰
gearBase    = ۲٬۵۶۰٬۰۰۰
base        = ۴٬۴۵۱٬۰۰۰

tier: ۱۲۰۰ ≥ ۱۰۰۰ → ۵٪
discount = round(1891000 × 0.05 / 1000) × 1000
         = round(94.55) × 1000 = ۹۵٬۰۰۰

shipping: ۱۲۰۰ ≥ ۱۰۰۰ → رایگان (۰)

total = ۴٬۴۵۱٬۰۰۰ − ۹۵٬۰۰۰ + ۰ = ۴٬۳۵۶٬۰۰۰ تومان
```

---

## ۷.۲ ریاضی میکس — `web/src/lib/blend.js`

مسئله: مشتری یک اهرم را می‌کشد، بقیه باید طوری جابه‌جا شوند که مجموع
**دقیقاً ۱۰۰** بماند.

### تابع `applyPercent` — خط‌به‌خط

```js
export function applyPercent(parts, slug, raw) {
  const self = parts.find((p) => p.slug === slug);
  if (!self) return parts;

  const others = parts.filter((p) => p.slug !== slug);
  if (others.length === 0) return parts;

  const want = clamp(Math.round(Number(raw) || 0), 0, 100);
  let delta = want - self.percent;
  if (delta === 0) return parts;
```

**خط ۲–۶:** محافظ‌های ورودی. اگر دانه پیدا نشد یا تنها دانه بود،
هیچ کاری نکن.

**خط ۸:** `clamp` مقدار را در بازهٔ ۰..۱۰۰ نگه می‌دارد.

**خط ۱۰:** اگر تغییری نبود، **همان آرایهٔ قبلی** برگردانده می‌شود.
این برای React مهم است: مرجع یکسان یعنی rerender اضافه نمی‌شود.

```js
  /* جای خالی بقیه در جهتی که باید حرکت کنند:
     اگر این دانه زیاد می‌شود، بقیه باید کم شوند. */
  const roomOf = (p) => (delta > 0 ? p.percent : 100 - p.percent);

  const totalRoom = others.reduce((s, p) => s + Math.max(0, roomOf(p)), 0);
  if (totalRoom <= 0) return parts;
```

**مفهوم «جای خالی» (room)** هستهٔ الگوریتم است:

- اگر این دانه **زیاد** می‌شود (`delta > 0`)، بقیه باید **کم** شوند.
  حداکثر کاهش هر دانه = مقدار فعلی‌اش (`p.percent`).
- اگر این دانه **کم** می‌شود، بقیه باید **زیاد** شوند.
  حداکثر افزایش هر دانه = `100 - p.percent`.

`totalRoom <= 0` یعنی هیچ‌جایی برای حرکت نیست (مثلاً همه صفرند و
می‌خواهیم این یکی را کم کنیم).

```js
  const need = Math.min(Math.abs(delta), totalRoom);
  const dir = delta > 0 ? 1 : -1;
  const target = self.percent + dir * need;
```

**`need` مقدار واقعی حرکت است.** اگر کاربر بخواهد از ۳۰ به ۹۰ برود
(delta = ۶۰) اما بقیه فقط ۴۰ جا داشته باشند، حرکت به ۷۰ محدود می‌شود.
یعنی **اهرم زودتر از انتها متوقف می‌شود** — رفتار درست، چون مجموع
نمی‌تواند از ۱۰۰ بیشتر شود.

```js
  /* سهم هر دانه به نسبت جای خالی‌اش */
  const shares = others.map((p) => {
    const room = Math.max(0, roomOf(p));
    return { slug: p.slug, room, take: Math.floor((need * room) / totalRoom) };
  });
```

**تخصیص نسبی:** دانه‌ای که جای خالی بیشتری دارد، سهم بیشتری از حرکت
می‌گیرد. `Math.floor` تضمین می‌کند هیچ‌کس بیش از سهمش نگیرد، اما
باقیمانده می‌ماند.

```js
  /* باقیماندهٔ گِردکردن را یکی‌یکی پخش می‌کنیم تا
     مجموع مو به مو درست دربیاید. */
  let left = need - shares.reduce((s, x) => s + x.take, 0);
  for (let i = 0; left > 0 && i < shares.length * 200; i++) {
    const s = shares[i % shares.length];
    if (s.take < s.room) { s.take++; left--; }
  }
```

**پخش باقیمانده به شیوهٔ round-robin.** مثلاً اگر `need = 10` و سه دانه
هرکدام `floor(3.33) = 3` بگیرند، جمع ۹ می‌شود و ۱ واحد می‌ماند. این
حلقه آن ۱ واحد را به اولین دانه‌ای که جا دارد می‌دهد.

شرط `s.take < s.room` جلوگیری می‌کند از اینکه دانه‌ای بیش از ظرفیتش
بگیرد.

`i < shares.length * 200` یک **محافظ حلقهٔ بی‌نهایت** است. از نظر
ریاضی نباید لازم باشد (چون `need <= totalRoom`)، اما اگر ورودی خراب
باشد، برنامه قفل نمی‌کند.

```js
  const takeBy = new Map(shares.map((s) => [s.slug, s.take]));

  return parts.map((p) => {
    if (p.slug === slug) return { ...p, percent: target };
    const take = takeBy.get(p.slug);
    if (!take) return p;
    return { ...p, percent: p.percent - dir * take };
  });
}
```

**اعمال نهایی به‌صورت تغییرناپذیر (immutable).** توجه کنید که
`if (!take) return p;` همان شیء قبلی را برمی‌گرداند — بهینه‌سازی برای
React.

`p.percent - dir * take`: اگر `dir = 1` (این دانه زیاد شد)، بقیه کم
می‌شوند؛ اگر `dir = -1`، بقیه زیاد می‌شوند.

### مثال عددی

ترکیب اولیه: `A=50, B=30, C=20`. کاربر A را به ۸۰ می‌برد.

```
delta = 80 - 50 = +30  →  dir = +1
roomOf(B) = 30   (چون delta>0، B می‌تواند تا ۳۰ کم شود)
roomOf(C) = 20
totalRoom = 50
need = min(30, 50) = 30
target = 50 + 30 = 80

shares:
  B: take = floor(30 × 30 / 50) = floor(18)   = 18
  C: take = floor(30 × 20 / 50) = floor(12)   = 12
  جمع = 30 → left = 0

نتیجه: A=80, B=30−18=12, C=20−12=8
مجموع = 80+12+8 = 100 ✓
```

حالت کرانی: کاربر A را به ۱۰۰ می‌برد.

```
delta = +50، totalRoom = 50، need = 50
B: floor(50×30/50) = 30 → B=0
C: floor(50×20/50) = 20 → C=0
نتیجه: A=100, B=0, C=0  → mixError: «میکس باید دست‌کم دو دانه داشته باشد»
```

دکمهٔ «افزودن» غیرفعال می‌شود چون `mixError` فقط دانه‌های `percent > 0`
را می‌شمارد.

### توابع کمکی

```js
export function addBean(parts, slug, share = 20) {
  if (parts.some((p) => p.slug === slug)) return parts;
  const withNew = [...parts, { slug, percent: 0 }];
  return applyPercent(withNew, slug, share);
}
```

هوشمندانه: دانه با **صفر درصد** اضافه می‌شود (پس مجموع همچنان ۱۰۰ است)
و بعد `applyPercent` آن را به ۲۰ می‌برد و از بقیه کم می‌کند. یعنی هیچ
منطق جداگانه‌ای برای «افزودن» لازم نیست.

```js
export function removeBean(parts, slug) {
  if (parts.length <= 2) return parts;
  const zeroed = applyPercent(parts, slug, 0);
  return zeroed.filter((p) => p.slug !== slug);
}
```

همان الگو برعکس: اول صفر کن (تا سهمش بین بقیه پخش شود)، بعد حذف کن.

`if (parts.length <= 2) return parts;` قاعدهٔ «میکس حداقل دو دانه» را
در سطح UI اعمال می‌کند. و در `BlendsSection` این بی‌اثری تشخیص داده
می‌شود:

```js
const drop = (slug) =>
  setMix((prev) => {
    const next = removeBean(prev, slug);
    if (next === prev) toast('میکس دست‌کم به دو دانه نیاز دارد');
    return next;
  });
```

مقایسهٔ مرجع (`next === prev`) کافی است چون تابع در حالت بی‌اثر همان
آرایه را برمی‌گرداند.

```js
export function mixError(parts) {
  const live = parts.filter((p) => p.percent > 0);
  if (live.length < 2) return 'میکس باید دست‌کم دو دانه داشته باشد';
  const sum = sumOf(live);
  if (Math.abs(sum - 100) > 1) return `مجموع درصدها باید ۱۰۰ باشد، الان ${sum} است`;
  return '';
}
```

کامنت بالایش: «همان قواعدی که سرور هم بررسی می‌کند.»
رواداری `> 1` برای خطای گرد کردن است.

---

## ۷.۳ حالت تصویری میکس — `web/src/lib/blendVisual.js`

حالت تصویری **هیچ درصدی حساب نمی‌کند.** هرچه به نسبت‌ها مربوط است از
`applyPercent` بالا می‌آید و همان‌جا می‌ماند؛ آنچه اینجاست سه محاسبهٔ
نمایشی است — و هر سه تابع خالص‌اند تا بشود بدون مرورگر تستشان کرد.

### ۱) `pourPlan` — بودجهٔ زمانی، نه زمانِ هر کیسه

مسئله: اگر هر کیسه زمان ثابتی بگیرد، میکس دو دانه‌ای یک ثانیه طول
می‌کشد و میکس هفت دانه‌ای سه و نیم ثانیه. تجربهٔ یکسان یعنی **کل**
مرحله ثابت باشد و سهم هر کیسه از آن درآید.

```js
export const POUR_BUDGET = 2600;   // کل مرحلهٔ ۲
export const POUR_MIN = 320;       // کوتاه‌ترین ریختنِ قابل‌دیدن
```

```js
const sum = live.reduce((s, p) => s + Number(p.percent), 0);
const share = live.length * min >= budget;
const extra = budget - live.length * min;

const ms = share
  ? Math.round(budget / live.length)
  : Math.round(min + (percent / sum) * extra);
```

دو حالت:

- **حالت عادی** — بودجه به کفِ همهٔ کیسه‌ها می‌رسد. هر کیسه `min`
  می‌گیرد به‌علاوهٔ سهمی از `extra` به نسبت درصدش. پس کیسهٔ ۶۰٪ محسوس‌تر
  می‌ریزد ولی کیسهٔ ۵٪ هم دیده می‌شود.
- **حالت شلوغ** (`share`) — آن‌قدر دانه هست که `live.length * min` از
  بودجه بیشتر شده. اینجا نسبت رها می‌شود و بودجه مساوی پخش می‌شود،
  وگرنه مرحلهٔ ۲ کِش می‌آمد.

و باقیماندهٔ گِردکردن روی آخرین کیسه می‌نشیند:

```js
const drift = budget - plan.reduce((s, x) => s + x.ms, 0);
last.ms = Math.max(120, last.ms + drift);
```

بدون این خط، هفت بار `Math.round` می‌توانست چند ده میلی‌ثانیه اختلاف
بسازد. `Math.max(120, …)` هم جلوی منفی شدن را می‌گیرد.

هر ردیف برنامه، سطح قیف را هم **پیش و پس از خودش** حمل می‌کند:

```js
const from = (done / sum) * 100;
done += percent;
return { slug, percent, index: i, ms, from, to: (done / sum) * 100 };
```

تقسیم بر `sum` (نه بر ۱۰۰) یعنی حتی اگر مجموع دقیقاً ۱۰۰ نبود، قیف در
پایان **کاملاً** پر می‌شود.

### ۲) `sackLayout` — نگه داشتن دهانهٔ کیسه سر قیف

بزرگی هر کیسه با سهمش عوض می‌شود:

```js
const scale = Number((0.72 + Math.min(1, Number(p.percent) / 100) * 0.46).toFixed(3));
```

بازهٔ ۰٫۷۲ تا ۱٫۱۸ — ملایم، تا تفاوت دیده شود ولی کیسهٔ کوچک هم هنوز
کیسه باشد.

اما همین مقیاس یک مسئلهٔ هندسی می‌سازد. کیسه حول **پایه‌اش** می‌چرخد،
پس با چرخشِ `tilt` دهانه‌اش به‌اندازهٔ `mouth × scale` از پایه فاصله
می‌گیرد — و این فاصله برای کیسهٔ کوچک و بزرگ فرق دارد. بدون تصحیح،
کیسهٔ کوچک بالای هوا خالی می‌کرد.

```js
const rad = (scene.tilt * Math.PI) / 180;
const up = [Math.sin(rad), -Math.cos(rad)];   // بردار یکهٔ محورِ کیسه
const reach = scene.mouth * scale;

hx: scene.hopper.x - reach * up[0],
hy: scene.hopper.y - reach * up[1]
```

یعنی: «پایه را از سر قیف، به‌اندازهٔ `reach` در خلافِ جهت محور عقب ببر.»
نتیجه این است که دهانهٔ *هر* کیسه — با هر بزرگی — دقیقاً روی
`SCENE.hopper` می‌ایستد. `blend-visual.test.js` همین را با محاسبهٔ
معکوس می‌سنجد.

فاصلهٔ کیسه‌ها هم با تعدادشان فشرده می‌شود تا از قاب بیرون نزنند:

```js
const room = scene.first - scene.last;
const slot = live.length > 1 ? Math.min(scene.slot, room / (live.length - 1)) : 0;
```

و `x: scene.first - i * slot` یعنی اولین انتخابِ مشتری **راست‌ترین**
کیسه است — جهت خواندن فارسی.

### ۳) `hopperLevel` — سهمِ تجمعی، نه شمارشِ کیسه

```js
export function hopperLevel(plan, k) {
  if (!plan.length || k <= 0) return 0;
  const i = Math.min(k, plan.length) - 1;
  return Number((plan[i].to / 100).toFixed(4));
}
```

عدد بازگشتی بین ۰ و ۱ است و مستقیماً به یک متغیر CSS می‌رود. نکتهٔ
اصلی‌اش این است که سطح از **درصدِ تجمعی** می‌آید نه از «چند کیسه از چند
کیسه»: با ترکیب ۹۰٪ و ۱۰٪، بعد از کیسهٔ اول قیف باید ۹۰٪ پر باشد، نه
۵۰٪.

### رنگ میکس — `mixTone` در `art.js`

رنگ قیف و بستهٔ پایانی، میانگین وزنیِ رنگِ رستِ دانه‌هاست:

```js
export const roastTone = (meter) => ROAST_TONE[meter] || ROAST_TONE[3];

export function mixTone(parts) { /* میانگین وزنی در فضای sRGB */ }
```

میانگین در همان فضای sRGB گرفته می‌شود؛ چون هر پنج رنگِ رست روی یک طیفِ
قهوه‌ایِ نزدیک‌به‌هم‌اند، میانگینِ ساده هم رنگِ باورپذیری می‌دهد و
نتیجه‌اش قابل پیش‌بینی و تست‌پذیر است.

مهم‌تر اینکه `ROAST_TONE` **همان جدولی است که کارت‌ها از آن رنگ
می‌گیرند** — صادر شده، نه کپی‌شده. وگرنه یک دانه در کارت یک رنگ می‌شد و
در ساز میکس رنگی دیگر.

### کم‌حرکتی

```js
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

دو نگهبان `typeof` لازم‌اند تا همین فایل در محیط node (تست) هم import
شود. با روشن بودنِ این تنظیم، `MixVisual` هیچ تایمری نمی‌سازد و با یک
کلیک مستقیم به مرحلهٔ ۴ می‌رود: همان بسته، همان قیمت، همان ردیف سبد —
فقط بدون نمایش.

---

## ۷.۴ قلاب اعتبارسنجی مدل `Item` — خط‌به‌خط

`server/src/models/Item.js`, `itemSchema.pre('validate', ...)`.

### قاعدهٔ ۱ — سازگاری دسته و نوع

```js
const allowedGroups = GROUPS_BY_KIND[this.kind] || [];
if (this.kind && !allowedGroups.includes(this.group)) {
  this.invalidate('group', `دستهٔ «${this.group}» برای این نوع کالا تعریف نشده است`);
}
```

جلوگیری از حالت‌های نامعتبر مثل «ابزار با دستهٔ light».

`this.invalidate(field, message)` روش Mongoose برای افزودن خطای
اعتبارسنجی است. برخلاف `throw`، اجازه می‌دهد بقیهٔ بررسی‌ها هم انجام
شوند و همهٔ خطاها یک‌جا جمع شوند.

### قاعدهٔ ۲ و ۳ — پیش‌فرض‌های ظاهری

```js
if (this.kind === 'gear') {
  if (!this.shape) this.shape = 'mug';
  if (!GEAR_SHAPES.includes(this.shape)) this.invalidate('shape', 'طرح ابزار نامعتبر است');
  if (!this.mat) this.mat = 'steel';
  if (!GEAR_MATERIALS.includes(this.mat)) this.invalidate('mat', 'جنس ابزار نامعتبر است');
  this.tone = '';
}

if (this.kind === 'powder') {
  if (!this.shape) this.shape = 'scoop';
  if (!POWDER_SHAPES.includes(this.shape)) this.invalidate('shape', 'طرح پودر نامعتبر است');
  if (!this.tone) this.tone = 'cocoa';
  if (!POWDER_TONES.includes(this.tone)) this.invalidate('tone', 'رنگ پودر نامعتبر است');
  this.mat = '';
}
```

الگوی **«پیش‌فرض بگذار، بعد اعتبارسنجی کن»**: خالی بودن خطا نیست (مقدار
معقول می‌گیرد) اما مقدار نامعتبر خطاست.

کامنت بالایش دلیل را می‌گوید: «شکل/جنس/رنگ باید جزو طرح‌های موجود باشند
وگرنه کارت خالی رندر می‌شود.» یعنی این اعتبارسنجی مستقیماً از یک نگرانی
سمت کلاینت (`art.js`) می‌آید.

`this.tone = ''` و `this.mat = ''` **پاک‌سازی متقاطع** است: ابزار رنگ
پودر ندارد و پودر جنس ندارد.

### قاعدهٔ ۴ و ۵ — قهوه در برابر غیرقهوه

```js
if (this.kind === 'coffee') {
  /* قهوه طرح اختصاصی ندارد؛ تصویرش از درجهٔ رست و دسته ساخته می‌شود */
  this.shape = '';
  this.mat = '';
  this.tone = '';
  this.pairs = [];
  this.grindable = true;   // هر قهوه‌ای آسیاب‌شدنی است
} else {
  /* فقط قهوه میکس می‌شود و آسیاب می‌خورد */
  this.grindable = false;
  this.isBlend = false;
  this.house = false;
  this.customizable = false;
  this.components = [];
  this.pool = [];
  this.surcharge = 0;
}
```

**`grindable` یک فیلد مشتق است.** در `WRITABLE` روتر نیست، پس مدیر
نمی‌تواند مستقیماً تنظیمش کند. همیشه از `kind` محاسبه می‌شود.

این باعث می‌شود قاعدهٔ تجاری «فقط قهوه آسیاب می‌شود» **غیرقابل نقض**
باشد — نه با فرم پنل، نه با درخواست دستی API.

### قاعدهٔ ۶ — یکپارچگی میکس

```js
if (this.isBlend) {
  if (this.components.length < 2) {
    this.invalidate('components', 'یک میکس دست‌کم به دو دانه نیاز دارد');
  } else {
    const sum = this.components.reduce((s, c) => s + c.percent, 0);
    /* یک واحد رواداری، چون درصدها گرد می‌شوند */
    if (Math.abs(sum - 100) > 1) {
      this.invalidate('components', `مجموع درصدها باید ۱۰۰ باشد، الان ${Math.round(sum)} است`);
    }
    const seen = new Set();
    for (const c of this.components) {
      if (seen.has(c.slug)) {
        this.invalidate('components', `دانهٔ «${c.slug}» دو بار در میکس آمده است`);
      }
      seen.add(c.slug);
      if (c.min > c.max) {
        this.invalidate('components', 'کمینهٔ درصد نمی‌تواند از بیشینه بزرگ‌تر باشد');
      }
    }
  }
}
```

چهار بررسی: تعداد، مجموع، تکرار، و بازهٔ معتبر. `Set` برای تشخیص تکرار
در O(n) به‌جای O(n²).

پیام خطا `${Math.round(sum)}` را نشان می‌دهد تا مدیر بداند چقدر فاصله
دارد.

### قاعدهٔ ۷ — پاک‌سازی غیرمیکس

```js
} else {
  /* غیرمیکس نه جزء دارد، نه ویژهٔ خانه است */
  this.components = [];
  this.pool = [];
  this.customizable = false;
  this.house = false;
  this.surcharge = 0;
}
```

اگر مدیر تیک «میکس» را بردارد، بقایای ترکیب قبلی در سند نمی‌ماند.

### گرد کردن نهایی

```js
if (typeof this.price === 'number') this.price = Math.round(this.price);
if (typeof this.meter === 'number') this.meter = Math.round(this.meter);

/* موجودی هم همین‌طور — نیم گرم و نیم عدد معنا ندارد.
   مقایسهٔ اتمی هنگام ثبت سفارش روی همین عدد صحیح
   انجام می‌شود، پس اعشار فقط دردسر است. */
if (typeof this.stock === 'number') this.stock = Math.max(0, Math.round(this.stock));
```

کامنت: «قیمت را گرد می‌کنیم تا اعشار سرگردان در پایگاه داده نماند.»

شرط `typeof … === 'number'` روی `stock` عمدی است و با `!= null` فرق
دارد: `null` یعنی **نامحدود** و باید دست‌نخورده رد شود. `Math.max(0, …)`
هم لایهٔ دوم است کنار `min: [0]` خودِ schema.

---

## ۷.۵ رزرو اتمی موجودی — `server/src/lib/stock.js`

### مسئله: رقابت بین دو مشتری

دو مشتری هم‌زمان آخرین ۵۰۰ گرم یرگاچف را سفارش می‌دهند. الگوی ساده
«اول بخوان، بعد بنویس» این‌طور شکست می‌خورد:

```
زمان   مشتری الف                 مشتری ب
────────────────────────────────────────────────────
t1     stock را می‌خواند → ۵۰۰
t2                             stock را می‌خواند → ۵۰۰
t3     ۵۰۰ ≥ ۵۰۰ ✓
t4                             ۵۰۰ ≥ ۵۰۰ ✓
t5     stock = 0 می‌نویسد
t6                             stock = 0 می‌نویسد
────────────────────────────────────────────────────
نتیجه: یک کیلو فروخته شد، ۵۰۰ گرم داشتیم
```

فاصلهٔ بین خواندن و نوشتن همان چیزی است که باید حذف شود.

### راه‌حل: شرط و کاهش در یک عملیات

```js
const updated = await ItemModel.findOneAndUpdate(
  { slug: item.slug, stock: { $gte: need } },   // شرط
  { $inc: { stock: -need } },                   // کاهش
  { new: true, projection: { stock: 1 } }
);
```

مونگو این دو را زیر **یک قفل سند** انجام می‌دهد. همان سناریو با این کد:

```
t1     الف: findOneAndUpdate  → سند قفل، ۵۰۰ ≥ ۵۰۰ ✓، stock = 0
t2     ب:   findOneAndUpdate  → سند قفل، ۰ ≥ ۵۰۰ ✗، null برمی‌گردد
```

دقیقاً یکی برنده می‌شود. هیچ transaction ای لازم نیست — که روی مونگوی
تک‌گرهی اصلاً در دسترس نیست.

### `null` یعنی نامحدود، و دو بار محافظت می‌شود

```js
export function isTracked(item) {
  return typeof item?.stock === 'number' && Number.isFinite(item.stock);
}
...
if (!isTracked(item)) continue;   // نامحدود — اصلاً لمس نمی‌شود
```

اگر این نگهبان نبود چه می‌شد؟ `$inc` روی `null` خطا می‌دهد و شرط
`{ $gte: need }` هم با `null` جور نمی‌شود. یعنی حتی در صورت فراموشی،
نتیجه به‌جای خراب شدن «ناموجود» می‌شد — یک شکستِ امن، ولی اشتباه. پس
نگهبان صریح لازم است.

### همه یا هیچ

هر ردیف جدا رزرو می‌شود، پس ردیف سوم می‌تواند بعد از موفقیت دو ردیف اول
شکست بخورد. `taken` هر رزرو موفق را نگه می‌دارد:

```js
const taken = [];
for (const line of lines) {
  ...
  if (!updated) {
    await releaseStock(taken, ItemModel);   // همه را با هم برگردان
    const fresh = await ItemModel.findOne({ slug: item.slug }, { stock: 1 }).lean();
    const left = typeof fresh?.stock === 'number' ? fresh.stock : 0;
    return { error: shortMessage(item, left), taken: [] };
  }
  taken.push({ slug: item.slug, amount: need });
}
```

و `releaseStock` که با `Promise.all` همه را موازی برمی‌گرداند:

```js
export async function releaseStock(taken, ItemModel) {
  if (!taken?.length) return;
  await Promise.all(
    taken.map((t) => ItemModel.updateOne({ slug: t.slug }, { $inc: { stock: t.amount } }))
  );
}
```

سه جا صدا زده می‌شود: وسط شکست حلقه، و در روتر اگر `Order.create` خطا
بدهد. نتیجه یک ضمانت ساده است: **سفارش یا کامل ثبت می‌شود یا اصلاً.**

### چرا موجودی برای پیام خطا دوباره خوانده می‌شود؟

عددی که در `item.stock` داریم از لحظهٔ `Item.find` در ابتدای مسیر آمده و
ممکن است چند صد میلی‌ثانیه قدیمی باشد. اگر همان را در پیام بگذاریم،
مشتری می‌خواند «فقط ۳۰۰ گرم مانده» و بعد سفارش ۳۰۰ گرمی هم رد می‌شود.
یک `findOne` اضافه فقط در **مسیر شکست** اجرا می‌شود، پس هزینه‌اش روی
مسیر عادی صفر است.

### دو دام باقی‌مانده

> **هشدار**
> **۱) موجودی میکس‌ها.** `stock` از خودِ کالای میکس کم می‌شود، نه از
> دانه‌های اجزایش. پس فروش یک میکس، موجودی یرگاچفِ داخلش را کم نمی‌کند.
> توصیه: میکس‌ها را نامحدود (`null`) بگذارید.
> **۲) رزرو بی‌بازگشت.** اگر سفارشی بعداً «لغو» شود، موجودی خودکار
> برنمی‌گردد — تغییر وضعیت هیچ کاری با انبار ندارد. مدیر باید دستی
> عدد را اصلاح کند.

---

## ۷.۶ پیگیری سفارش بدون حساب — `server/src/lib/track.js`

مشتری حساب کاربری ندارد، پس اثبات مالکیت باید از چیزی بیاید که فقط خودش
دارد: جفتِ «شمارهٔ سفارش + شمارهٔ موبایل». کد را فقط کسی دارد که رسید را
دیده، و شماره را فقط کسی که خودش سفارش داده.

سه الگوریتم کوچک این را نگه می‌دارند.

### ۱) نرمال‌سازی — یک شکل واحد برای هر شکلِ تایپ

```js
export function normalizePhone(raw) {
  const digits = toLatin(raw).replace(/\D/g, '');
  if (!digits) return '';

  let d = digits;
  if (d.startsWith('0098')) d = d.slice(4);
  else if (d.length === 12 && d.startsWith('98')) d = d.slice(2);

  if (d.length === 10 && d.startsWith('9')) d = '0' + d;
  return d;
}
```

| ورودی | خروجی |
|---|---|
| `۰۹۱۲۱۲۳۴۵۶۷` | `09121234567` |
| `0912 123-4567` | `09121234567` |
| `+989121234567` | `09121234567` |
| `00989121234567` | `09121234567` |
| `9121234567` | `09121234567` |

ترتیب شرط‌ها مهم است: اول پیش‌شمارهٔ کشور برداشته می‌شود، بعد صفر ابتدایی
اضافه. شرط `d.length === 12` جلوی برداشتنِ اشتباهیِ «۹۸» از شماره‌ای که
واقعاً با ۹۸ شروع می‌شود را می‌گیرد.

اگر شکل ورودی اصلاً موبایل ایرانی نبود، همان رقم‌ها برمی‌گردند — تصمیم
دربارهٔ معتبر بودن با صداکننده است، نه با این تابع.

`normalizeCode` هم همان کار را برای کد می‌کند: رقم فارسی، حروف کوچک و
نبودِ خط تیره را می‌پذیرد و همیشه شکل ذخیره‌شده (`A1B2-3456`) را
برمی‌گرداند.

### ۲) مقایسه در زمان ثابت

```js
export function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a ?? ''), 'utf8').digest();
  const hb = crypto.createHash('sha256').update(String(b ?? ''), 'utf8').digest();
  return crypto.timingSafeEqual(ha, hb);
}
```

چرا اول هش؟ `crypto.timingSafeEqual` طول‌های نابرابر را قبول نمی‌کند و
**پرتاب خطا** می‌کند — که خودش یک نشتِ زمانی است: شمارهٔ ۱۱ رقمی در
برابر شمارهٔ ۵ رقمی فوراً خطا می‌داد، شمارهٔ ۱۱ رقمیِ غلط کندتر.

خروجی sha256 همیشه ۳۲ بایت است، پس مقایسه همیشه یک شکل و یک هزینه دارد.

### ۳) پاسخِ یکسان برای دو شکست متفاوت

```js
const doc = await OrderModel.findOne({ code: wantedCode }).lean();

/* حتی وقتی سفارشی پیدا نشده، یک مقایسه انجام می‌دهیم —
   تا زمانِ پاسخ در هر دو حالت یکی باشد. */
const stored = normalizePhone(doc?.customer?.phone);
const matches = safeEqual(stored || ' no-order', wantedPhone);

if (!doc || !matches) {
  return { status: 404, error: NOT_FOUND_MESSAGE };
}
```

دو نکته در این پنج خط:

**الف)** `!doc` جداگانه بررسی نمی‌شود تا زودتر برگردد. اگر برای کد
ناموجود سریع‌تر پاسخ می‌دادیم، خودِ زمانِ پاسخ می‌گفت «این کد وجود
دارد» — و صفحهٔ پیگیری به ابزار شمارش سفارش‌ها تبدیل می‌شد.

**ب)** رشتهٔ نگهبان ` no-order` عمداً با فاصله شروع می‌شود، پس هیچ‌وقت
با یک شمارهٔ نرمال‌شدهٔ واقعی برابر نمی‌شود.

`NOT_FOUND_MESSAGE` یک ثابت صادرشده است، نه رشتهٔ درجا — تا اگر روزی
کسی خواست پیام را عوض کند، مجبور شود در یک جا عوضش کند و دو پیام متفاوت
درنیاید.

### whitelist خروجی

`publicOrderView` سند سفارش را **بازسازی** می‌کند، نه اینکه فیلدهای
ناخواسته را از آن حذف کند:

```js
return {
  code: order.code,
  status: order.status,
  createdAt: order.createdAt,
  customer: { name: order.customer?.name || '' },
  lines: (order.lines || []).map((l) => ({ kind: l.kind, name: l.name, ... })),
  totals: { base: ..., discount: ..., shipping: ..., total: ... }
};
```

فرق این دو رویکرد در **آینده** است: با `delete`، هر فیلدی که فردا به مدل
اضافه شود به‌طور پیش‌فرض بیرون می‌رود؛ با whitelist، به‌طور پیش‌فرض
داخل نمی‌آید. `track.test.js` دقیقاً همین را می‌سنجد — یک سفارش با
فیلدهای ساختگیِ `adminNote` و `profitMargin` می‌سازد و انتظار دارد هیچ
اثری از آن‌ها در خروجی نباشد.

نشانی، شمارهٔ تماس و یادداشت مشتری عمداً بیرون‌اند: دیدنِ وضعیت و فهرست
کالاها به نشانی نیازی ندارد، و اگر روزی کسی جفت کد و شماره را حدس زد
نباید نشانی خانهٔ کسی را هم برداشته باشد. نام می‌ماند، چون به مشتری
اطمینان می‌دهد سفارش خودش را می‌بیند و چیزی بیشتر از آنچه خودش نوشته
نشان نمی‌دهد.

---

## ۷.۷ تقویم شمسی — `server/src/lib/jalali.js`

### چرا دست‌نویس؟

کامنت بالای فایل:

> گزارش‌ها باید با تقویمی دسته‌بندی شوند که مدیر می‌بیند: «مرداد» یعنی
> مرداد، نه August. پس بازه‌ها روی تقویم جلالی بسته می‌شوند، نه میلادی.

یک ماه شمسی هیچ تطابقی با ماه میلادی ندارد. مرداد ۱۴۰۵ از ۲۳ ژوئیه تا
۲۲ اوت ۲۰۲۶ است. اگر گزارش ماهانه روی تقویم میلادی بسته می‌شد، هر
«ماه» بین دو ماه شمسی تقسیم می‌شد.

<!--DIAGRAM:jalali-->

### هستهٔ تبدیل — الگوریتم jalaali

```js
function jalCal(jy) {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
    1635, 1701, 1866, 2020, 2620, 3220, 3628
  ];
  ...
}
```

این آرایه **نقاط شکست چرخهٔ کبیسه** در تقویم جلالی است. برخلاف تقویم
میلادی که قاعدهٔ ساده‌ای دارد، تقویم جلالی بر پایهٔ اعتدال بهاری واقعی
است و الگوی کبیسه‌اش در بازه‌های ۳۳ ساله (گاهی ۲۹ یا ۳۷) تکرار می‌شود.

توابع `g2d`, `d2g`, `d2jInternal` از **شمارهٔ روز ژولین** (Julian Day
Number) به‌عنوان پل بین دو تقویم استفاده می‌کنند — تکنیک استاندارد
تبدیل تقویم.

### مدیریت منطقهٔ زمانی — بخش هوشمندانه

```js
/* ایران از سال ۱۴۰۱ ساعت تابستانی ندارد و اختلافش با
   UTC همیشه ۳:۳۰ است — ولی سفارش‌های قدیمی‌تر ممکن است
   از دورهٔ ساعت تابستانی (۴:۳۰) باشند. پس به‌جای عددِ
   ثابت، اختلاف واقعیِ همان لحظه را از خود سیستم
   می‌پرسیم تا هیچ سفارشی یک روز جابه‌جا نیفتد. */
const TEHRAN = 'Asia/Tehran';
const FALLBACK_OFFSET_MIN = 210;

const tzFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TEHRAN, hour12: false,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit'
});

function offsetMinAt(date) {
  try {
    const p = zoned(date);
    const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    return Math.round((asUTC - date.getTime()) / 60000);
  } catch {
    return FALLBACK_OFFSET_MIN;
  }
}
```

**ترفند:** `Intl.DateTimeFormat` با `timeZone: 'Asia/Tehran'` اجزای
تاریخ محلی تهران را می‌دهد. اگر آن اجزا را دوباره به‌عنوان UTC تفسیر
کنیم و از زمان واقعی کم کنیم، اختلاف منطقهٔ زمانی به دست می‌آید.

این کار **پایگاه دادهٔ IANA داخل موتور جاوااسکریپت** را به کار می‌گیرد،
که تاریخچهٔ کامل ساعت تابستانی ایران را دارد.

```js
function zoned(date) {
  const p = {};
  for (const part of tzFormat.formatToParts(date)) {
    if (part.type !== 'literal') p[part.type] = Number(part.value);
  }
  /* ساعت ۲۴ در برخی نسخه‌ها یعنی نیمه‌شب */
  if (p.hour === 24) p.hour = 0;
  return p;
}
```

آن `if (p.hour === 24)` یک باگ شناخته‌شدهٔ برخی نسخه‌های V8 را دور
می‌زند.

### تصحیح دومرحله‌ای نیمه‌شب

```js
/* نیمه‌شب تهرانِ یک روز میلادی، به‌صورت لحظهٔ واقعی (UTC).
   دو بار تصحیح می‌کنیم تا اگر آن روز مرزِ ساعت تابستانی
   بوده هم به نیمه‌شبِ درست برسیم. */
function tehranMidnight(gy, gm, gd) {
  const naive = Date.UTC(gy, gm - 1, gd);
  let t = naive - FALLBACK_OFFSET_MIN * 60000;
  for (let i = 0; i < 2; i += 1) t = naive - offsetMinAt(new Date(t)) * 60000;
  return new Date(t);
}
```

مسئله: برای دانستن اختلاف زمانی در یک لحظه، باید آن لحظه را بدانیم؛ اما
برای دانستن آن لحظه، باید اختلاف را بدانیم. راه‌حل: **تکرار**.

با حدس اولیهٔ ۳:۳۰، اختلاف واقعی را بپرس، تصحیح کن، دوباره بپرس. دو
تکرار برای همگرایی کافی است.

### بازه‌بندی

```js
export function bucketOf(date, period) {
  const p = tehranParts(date);

  if (period === 'day') {
    const j = gregorianToJalali(p.gy, p.gm, p.gd);
    return makeBucket('day', j.jy, j.jm, j.jd);
  }

  if (period === 'week') {
    /* getUTCDay: ۰ یکشنبه … ۶ شنبه. فاصله تا شنبهٔ قبل: */
    const back = (p.weekday + 1) % 7;
    const sat = new Date(Date.UTC(p.gy, p.gm - 1, p.gd) - back * DAY_MS);
    const j = gregorianToJalali(sat.getUTCFullYear(), sat.getUTCMonth() + 1, sat.getUTCDate());
    return makeBucket('week', j.jy, j.jm, j.jd);
  }
  ...
}
```

**فرمول `(weekday + 1) % 7`** تعداد روزهای عقب‌گرد تا شنبهٔ قبل را
می‌دهد:

| `weekday` | روز | `(w+1)%7` | یعنی |
|---|---|---|---|
| ۶ | شنبه | ۰ | خودش |
| ۰ | یکشنبه | ۱ | یک روز عقب |
| ۱ | دوشنبه | ۲ | دو روز عقب |
| ۵ | جمعه | ۶ | شش روز عقب |

**هفتهٔ ایرانی از شنبه شروع می‌شود** — نه یکشنبه (آمریکا) و نه دوشنبه
(ISO). این جزئیاتی است که کتابخانه‌های عمومی معمولاً اشتباه می‌گیرند.

### برچسب‌های هوشمند هفته

```js
} else if (period === 'week') {
  end = new Date(start.getTime() + 7 * DAY_MS);
  const last = toJalali(new Date(end.getTime() - DAY_MS));
  key = `w:${jy}-${pad(jm)}-${pad(jd)}`;
  label = jm === last.jm
    ? `${faDigits(jd)} تا ${faDigits(last.jd)} ${JMONTHS[jm - 1]} ${faDigits(jy)}`
    : `${faDigits(jd)} ${JMONTHS[jm - 1]} تا ${faDigits(last.jd)} ${JMONTHS[last.jm - 1]} ${faDigits(last.jy)}`;
}
```

اگر هفته داخل یک ماه باشد: «۱۴ تا ۲۰ مرداد ۱۴۰۵».
اگر بین دو ماه باشد: «۲۹ مرداد تا ۴ شهریور ۱۴۰۵».

### تولید سری زمانی

```js
export function bucketSeries(period, count, now = new Date()) {
  const list = [];
  let b = bucketOf(now, period);
  for (let i = 0; i < count; i += 1) {
    list.unshift(b);
    b = previousBucket(b, period);
  }
  return list;
}

export function previousBucket(bucket, period) {
  return bucketOf(new Date(bucket.start.getTime() - DAY_MS), period);
}
```

**ترفند `previousBucket`:** به‌جای محاسبهٔ حسابی «ماه قبل» (که با
طول‌های متغیر ماه شمسی پیچیده است)، یک روز از شروع بازه کم می‌کند و
می‌پرسد «این لحظه در کدام بازه است؟» — چون یک روز قبل از اول مرداد،
حتماً در تیر است.

`unshift` باعث می‌شود آرایه از قدیم به جدید مرتب باشد. و **بازه‌های خالی
هم در فهرست می‌مانند** — پس نمودار گزارش حفره ندارد.

### دو قالب عددی

```js
const faDigits = (v) => String(v).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

export function jalaliDateString(date) {
  const j = toJalali(date);
  return `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`;   // ← رقم لاتین
}
```

کامنت دلیل تفاوت را می‌گوید:

> برچسب‌ها با رقم فارسی نوشته می‌شوند تا کنار بقیهٔ عددهای پنل یکدست
> باشند. رقم لاتین فقط در فایل خروجی می‌ماند، چون اکسل باید عدد را
> بشناسد.

---

## ۷.۸ الگوریتم پرفروش‌ها — `server/src/routes/stats.js`

```js
const rows = await Order.aggregate([
  { $match: { status: { $ne: 'canceled' } } },
  { $unwind: '$lines' },
  {
    $group: {
      _id: '$lines.slug',
      /* واحدها متفاوت‌اند، پس «تعداد دفعات سفارش» را
         ملاک می‌گیریم که بین وزنی و عددی قابل مقایسه است. */
      orders: { $sum: 1 },
      grams:  { $sum: '$lines.grams' },
      qty:    { $sum: '$lines.qty' },
      revenue:{ $sum: '$lines.lineTotal' }
    }
  },
  { $sort: { orders: -1, revenue: -1 } },
  { $limit: 60 }
]);
```

**چرا `$sum: 1` و نه وزن یا مبلغ؟** کامنت جواب می‌دهد: نمی‌شود ۵۰۰ گرم
قهوه را با ۲ عدد ماگ مقایسه کرد. اما «چند بار سفارش داده شده» برای هر
دو معنی یکسانی دارد.

`revenue` به‌عنوان معیار دوم مرتب‌سازی، تساوی‌ها را می‌شکند.

سپس مرحلهٔ دوم در جاوااسکریپت:

```js
const salesBySlug = new Map(rows.map((r) => [r._id, r]));

const items = await Item.find({ active: true, excludeTop: { $ne: true } })
  .lean({ virtuals: true });

const scored = items
  .map((it) => {
    const s = salesBySlug.get(it.slug);
    return { ...it, sales: s ? {...} : null };
  })
  .filter((it) => it.pinnedTop || it.sales)
  .sort((a, b) => {
    /* سنجاق‌شده‌ها همیشه بالا */
    if (a.pinnedTop !== b.pinnedTop) return a.pinnedTop ? -1 : 1;
    const ao = a.sales?.orders || 0;
    const bo = b.sales?.orders || 0;
    if (bo !== ao) return bo - ao;
    return (a.rank || 999) - (b.rank || 999);
  })
  .slice(0, limit);
```

**سه‌سطحی بودن مرتب‌سازی:**
۱. سنجاق‌شده‌ها اول
۲. تعداد سفارش (نزولی)
۳. `rank` مدیر (صعودی) — برای شکستن تساوی

**چرا join در جاوااسکریپت و نه `$lookup`؟** چون فروش از `orders` و
فیلترها (`active`, `excludeTop`, `pinnedTop`) از `items` می‌آیند، و
تعداد کالاها کوچک است (۱۰۶). دو کوئری ساده خواناتر از یک aggregate
پیچیده با `$lookup` است.

**`excludeTop: { $ne: true }`** به‌جای `excludeTop: false` — چون
اسناد قدیمی ممکن است این فیلد را اصلاً نداشته باشند و `$ne: true` هم
`false` و هم `undefined` را می‌گیرد.

`{ $limit: 60 }` در aggregate و `slice(0, limit)` در انتها: مرحلهٔ اول
سقف معقولی می‌گذارد، مرحلهٔ دوم برش نهایی را می‌زند.

---

## ۷.۹ تولید تصویر — `web/src/lib/art.js`

> **نکته**
> این فایل تابع خالص است و `CardArt` هیچ هوکی ندارد، پس **روی سرور**
> اجرا می‌شود: SVG کارت‌ها داخل همان HTML اولی می‌آید که Next می‌فرستد.
> بهایش حجم HTML است و سودش این است که صفحه بدون اجرای هیچ
> جاوااسکریپتی تصویر دارد. بحث کاملش در فصل ۱۰، پرسش ۳۸.

### بی‌خطرسازی متن پیش از رفتن داخل SVG

این باید **اول** بیاید، چون بر همهٔ تولیدکننده‌های این فایل حاکم است.

خروجی `art.js` یک **رشته** است، نه گرهٔ React، و `CardArt` آن را با
`dangerouslySetInnerHTML` تزریق می‌کند — یعنی React هیچ‌چیز را برایمان
escape نمی‌کند و مرورگر هرچه اینجا نوشتیم را همان‌طور نشانه‌گذاری
می‌خواند.

```js
const ESCAPES = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };

export const esc = (s) => String(s ?? '').replace(/[<>&"']/g, (c) => ESCAPES[c]);
```

نام کالا را **مدیر** می‌نویسد و از پایگاه داده می‌آید. بدون این تابع،
نامی مثل:

```
" onload="alert(1)
```

از `aria-label` بیرون می‌زد و به صفتِ اجراشدنی تبدیل می‌شد:

```html
<!-- بدون esc -->
<svg aria-label="" onload="alert(1)">
<!-- با esc -->
<svg aria-label="&quot; onload=&quot;alert(1)">
```

پس هر متنی که از پایگاه داده می‌آید از اینجا رد می‌شود — نام کالا، نام
دسته، و در حالت تصویری، نام میکس و نام تک‌تک دانه‌ها.

سه جزئیات:

**۱) `String(s ?? '')`** — نبودِ مقدار به رشتهٔ خالی تبدیل می‌شود، نه به
`"undefined"` که روی کارت چاپ می‌شد.

**۲) یک بار escape، نه دو بار.** چون `&` هم در همان یک `replace` است، نه
در یک گذر جدا، رشتهٔ `A & B` می‌شود `A &amp; B` و نه `A &amp;amp; B`.

**۳) عددها هم خطر دارند.** `zoom` داخل صفت `transform` می‌نشیند، پس
اصلاً از راه رشته وارد نمی‌شود:

```js
const numOr = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
```

عددِ نامعتبر به پیش‌فرض برمی‌گردد؛ چیزی برای escape کردن باقی نمی‌ماند.

`card-art.test.js` هر چهار تولیدکننده (قهوه، ابزار، پودر، بستهٔ میکس) را
با نام خصمانه می‌سنجد و — نکتهٔ کمیاب — **خودِ سنجه را هم می‌سنجد**: یک
تست عمداً رشتهٔ escape‌نشده می‌سازد و انتظار دارد سنجه شکست را ببیند، تا
اگر روزی regexِ بررسی خراب شد بقیهٔ تست‌ها بی‌صدا سبز نمانند.

### مولد شبه‌تصادفی با بذر

```js
/** مولد عدد شبه‌تصادفی با بذر ثابت (تا طرح هر قهوه تغییر نکند) */
function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h ^= h >>> 13;
    return ((h >>> 0) % 100000) / 100000;
  };
}
```

**مرحلهٔ اول** هش FNV-1a است: `2166136261` و `16777619` ثابت‌های
استاندارد FNV هستند. رشته به یک عدد ۳۲ بیتی تبدیل می‌شود.

**مرحلهٔ دوم** یک مولد xorshift/multiply است که هر بار عددی بین ۰ و ۱
برمی‌گرداند.

`Math.imul` ضرب ۳۲ بیتی صحیح انجام می‌دهد (بدون تبدیل به شناور) و
`h >>> 0` عدد را به بدون‌علامت تبدیل می‌کند.

**چرا اهمیت دارد؟** چون طرح هر کالا باید **همیشه یکسان** باشد. با
`Math.random()` هر بار که صفحه رفرش می‌شد، چیدمان دانه‌ها عوض می‌شد و
کارت‌ها بی‌ثبات به نظر می‌رسیدند.

### تولید کارت قهوه

```js
export function productArt(p) {
  const rnd = seeded(p.slug);
  const [bg1, bg2, accent] = GROUP_SCENE[p.group] || GROUP_SCENE.medium;
  const [c1, c2, crease]   = ROAST_TONE[p.meter] || ROAST_TONE[3];
  const uid = 'k' + p.slug.replace(/[^a-z0-9]/gi, '');

  // چیدمان پایه؛ هر دانه کمی جابه‌جا و چرخانده می‌شود
  const spots = [
    [140, 78, 1.75], [64, 44, 1.0], [212, 92, 1.05],
    [50, 112, .82],  [196, 34, .78], [104, 122, .7], [246, 126, .62]
  ];

  const beans = spots.map(([x, y, s]) => {
    const rot = Math.round(rnd() * 160 - 80);
    const sc  = (s * (0.9 + rnd() * 0.22)).toFixed(2);
    const dx  = Math.round(rnd() * 18 - 9);
    const dy  = Math.round(rnd() * 14 - 7);
    const op  = (0.72 + rnd() * 0.28).toFixed(2);
    return `<g transform="translate(${x + dx} ${y + dy}) rotate(${rot}) scale(${sc})" opacity="${op}">
      <ellipse rx="25" ry="17.5" fill="url(#b${uid})"/>
      <path d="M-19 0c6-7.5 6 7.5 19-7.5" fill="none" stroke="${crease}" stroke-width="2.6" stroke-linecap="round"/>
      <ellipse cx="-7" cy="-7" rx="7" ry="3.4" fill="#FFFFFF" opacity=".16"/>
    </g>`;
  }).join('');
  ...
}
```

**«تصادفی کنترل‌شده»:** موقعیت پایهٔ هفت دانه دستی طراحی شده (تا ترکیب
بصری خوب باشد)، اما چرخش ±۸۰ درجه، مقیاس ۰٫۹–۱٫۱۲ برابر، جابه‌جایی ±۹
پیکسل و شفافیت ۰٫۷۲–۱ از مولد بذردار می‌آیند.

هر دانه سه عنصر دارد: بیضی با گرادیان، شیار وسط، و یک بازتاب سفید کم‌رنگ.

**رنگ‌ها از دو منبع:**

```js
const ROAST_TONE = {
  1: ['#D3A468', '#A9743A', '#EBC894'],   // روشن‌ترین
  2: ['#BE8B4C', '#8E5C2A', '#DEB47F'],
  3: ['#9C6B3C', '#66401F', '#C79763'],
  4: ['#77492A', '#442715', '#A5734A'],
  5: ['#523020', '#26150B', '#84543A']    // تیره‌ترین
};
```

`meter` (درجهٔ رست ۱ تا ۵) رنگ دانه را تعیین می‌کند — یعنی **قهوهٔ رست
تیره واقعاً تیره‌تر کشیده می‌شود**. این یک اطلاعات بصری واقعی است، نه
تزئین.

`GROUP_SCENE[group]` پس‌زمینه را می‌دهد و کامنتش هوشمندانه است:
«روشن نگه داشته می‌شوند تا دانه‌های تیره روی‌شان خوانا بمانند.»

### چرا `uid`؟

```js
const uid = 'k' + p.slug.replace(/[^a-z0-9]/gi, '');
...
<linearGradient id="b${uid}" ...>
<ellipse fill="url(#b${uid})"/>
```

شناسه‌های SVG **در کل سند سراسری‌اند**. اگر ۱۰۶ کارت همه
`id="beanGradient"` داشتند، همه از اولی استفاده می‌کردند و همهٔ کارت‌ها
یک رنگ می‌شدند. با پیشوند slug، هر کارت گرادیان خودش را دارد.

پیشوند `'k'` (و `'v'` برای ابزار، `'p'` برای پودر) تضمین می‌کند شناسه با
رقم شروع نشود — که در HTML4 نامعتبر بود و هنوز در بعضی موتورها مشکل‌ساز
است.

### کارت ابزار و پودر

```js
export function gearArt(it) {
  const c   = MATERIAL[it.mat] || MATERIAL.steel;
  const z   = it.zoom || 1;
  const draw = (SHAPES[it.shape] || SHAPES.mug)(c, accent);
  ...
  <g transform="translate(140 76) scale(${z})">${draw}</g>
}
```

`SHAPES` یک شیء از **۳۶ تابع** است که هرکدام رنگ‌های جنس را می‌گیرند و
مسیر SVG برمی‌گردانند:

```js
dripper: c => `
  <path d="M-40 -26 L40 -26 L11 24 L-11 24 Z" fill="${c.main}"/>
  <path d="M-40 -26 L0 -26 L0 24 L-11 24 Z" fill="${c.dk}" opacity=".18"/>
  ...`,
```

هر طرح در مختصات محلی حدود ۹۰×۹۰ با مرکز (۰،۰) کشیده شده، و
`translate(140 76)` آن را وسط قاب ۲۸۰×۱۵۰ می‌گذارد. `scale(z)` هم اجازه
می‌دهد مدیر برای اشیای کوچک (مثل دماسنج، `zoom: 1.15`) یا بزرگ (موکاپات
سه‌کاپ، `zoom: 0.85`) اندازه را تنظیم کند.

**تفکیک رنگ از شکل:** ۳۶ شکل × ۱۱ جنس = ۳۹۶ ترکیب ممکن، با نوشتن
۳۶ + ۱۱ تعریف.

```js
const MATERIAL = {
  steel:   { main:'#C3CAD0', dk:'#8A939B', lt:'#EFF3F6' },
  copper:  { main:'#C8874E', dk:'#8E5729', lt:'#E8B683' },
  ...
};
```

هر جنس سه رنگ دارد: اصلی، سایه، روشنایی — که در همهٔ طرح‌ها به‌طور
یکنواخت استفاده می‌شوند.

برای پودر، `heap(tone, width)` تپهٔ پودر را می‌کشد و `POWDER_SHAPES`
ظرف یا ادویهٔ کنارش را.

---

## ۷.۱۰ قالب‌بندی اعداد فارسی

```js
export const toFa = (n) => Number(n || 0).toLocaleString('fa-IR');
```

`toLocaleString('fa-IR')` دو کار همزمان: رقم‌های فارسی (`۰-۹`) و
جداکنندهٔ هزارگان فارسی (`٬` — U+066C، نه کاما).

`1850000` → `۱٬۸۵۰٬۰۰۰`

```js
export function formatWeight(g) {
  if (g < 1000) return toFa(g) + ' گرم';
  const kg = g / 1000;
  return toFa(Number.isInteger(kg) ? kg : kg.toFixed(2)) + ' کیلوگرم';
}
```

| ورودی | خروجی |
|---|---|
| `250` | `۲۵۰ گرم` |
| `1000` | `۱ کیلوگرم` |
| `1500` | `۱٫۵۰ کیلوگرم` |
| `2750` | `۲٫۷۵ کیلوگرم` |

`Number.isInteger(kg)` جلوی «۱٫۰۰ کیلوگرم» را می‌گیرد.

### تبدیل معکوس

```js
export function toLatinDigits(str) {
  return String(str ?? '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/,/g, '');
}
```

سه تبدیل: رقم فارسی → لاتین، رقم عربی → لاتین، حذف کاما.

**چرا دو بلوک جدا؟** رقم فارسی (U+06F0–U+06F9) و رقم عربی
(U+0660–U+0669) کدهای یونیکد **متفاوتی** دارند، هرچند شکل بعضی‌شان شبیه
است. کاربر ایرانی معمولاً رقم فارسی می‌زند اما کیبوردهای عربی رقم عربی
می‌دهند.

استفاده‌ها:
- `CartDrawer`: قبل از اعتبارسنجی شماره تلفن
- `ClubSection`: همان
- `AdminItemForm`: روی قیمت، `rank`، `surcharge` و درصدهای میکس

با کامنت: «تا مدیر بتواند قیمت را با کیبورد فارسی هم بنویسد.»

### تاریخ

```js
export function faDate(iso) {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(iso));
  } catch { return ''; }
}
```

`Intl` با locale `fa-IR` **خودکار تقویم شمسی** می‌دهد. یعنی در کلاینت
اصلاً نیازی به `jalali.js` نیست. سرور آن را لازم دارد چون باید بازه‌ها
را روی مرز روزهای شمسی ببندد — کاری که `Intl` انجام نمی‌دهد.

---

## ۷.۱۱ الگوریتم‌های کوچک‌تر

### شناسهٔ ردیف سبد — `web/src/lib/cartLine.js`

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

سه تصمیم:
- `[...mix]` کپی می‌سازد تا `.sort()` آرایهٔ اصلی را عوض نکند. این فقط
  ادب نیست: حالت تصویری با **ترتیب انتخاب مشتری** کیسه‌ها را می‌ریزد، پس
  مرتب کردنِ آرایهٔ اصلی نمایش را به‌هم می‌زد.
- `.filter(percent > 0)` دانه‌های برداشته‌شده را حذف می‌کند، پس
  «۶۰/۴۰/۰» و «۶۰/۴۰» یک امضا دارند.
- `.sort()` ترتیب را نرمال می‌کند — داخل امضا، نه روی داده.

نتیجه: `espresso-70-30|espresso|cerrado:60,monsooned:40`

این تابع همراه `buildLine` از `ShopContext` بیرون کشیده شد وقتی ساز میکس
دو حالت پیدا کرد. حالا هر دو راه — اهرم‌های ساده و حالت تصویری — از
همین یک تابع رد می‌شوند، پس «یک میکس، از هر راهی که ساخته شود، دقیقاً
همان ردیف سبد» یک ادعای تست‌پذیر است نه یک امید.

### پیشنهاد روز

```js
const dayIndex = () => Math.floor(Date.now() / 86400000);
const daily = featured.length ? featured[dayIndex() % featured.length] : null;
```

کامنت: «پیشنهاد روز هر روز عوض می‌شود، ولی در طول یک روز ثابت می‌ماند —
تا اگر مشتری صفحه را دوباره باز کرد همان چیزی را ببیند که صبح دیده بود.»

`86400000` میلی‌ثانیهٔ یک روز است. تقسیم صحیح، شمارهٔ روز از epoch را
می‌دهد. باقیماندهٔ آن بر تعداد کالاهای منتخب، چرخش روزانه می‌سازد.

توجه: این محاسبه بر پایهٔ **UTC** است، نه وقت تهران. پس پیشنهاد ساعت
۳:۳۰ بامداد عوض می‌شود، نه نیمه‌شب.

و یک نکتهٔ تازه که با رندر سمت سرور اضافه شد: این تنها محاسبهٔ پروژه است
که **به لحظهٔ اجرا وابسته است**. سرور و مرورگر آن را در دو لحظهٔ متفاوت
حساب می‌کنند، و اگر آن دو لحظه دو طرف نیمه‌شبِ UTC بیفتند، دو کالای
متفاوت انتخاب می‌شود — یعنی یک ناسازگاری hydration، یک بار در هر
شبانه‌روز و فقط برای کسی که دقیقاً همان چند ثانیه صفحه را باز کرده باشد.

راه بستنش این است که انتخاب روی سرور انجام شود و نتیجه به‌شکل prop
پایین برود. الان بسته نشده، چون اثرش یک کارت جابه‌جاشده است نه از دست
رفتن داده — ولی جای دانستن دارد.

### پلهٔ تخفیف بعدی

```js
const nextTier = useMemo(() => {
  if (totals.grams <= 0) return null;
  return [...TIERS].reverse().find((t) => t.min > totals.grams) || null;
}, [totals.grams]);
```

و نمایشش در سبد:

```jsx
{nextTier ? (
  <p className="next-tier">
    {formatWeight(nextTier.min - totals.grams)} دیگر اضافه کنید تا تخفیف {nextTier.label} فعال شود.
  </p>
) : null}
```

با ۶۰۰ گرم: «۴۰۰ گرم دیگر اضافه کنید تا تخفیف ۵٪ فعال شود.»
با ۶۰۰۰ گرم: `find` چیزی پیدا نمی‌کند → `null` → پیامی نشان داده نمی‌شود.

### تولید slug از نام فارسی

```js
function suggestSlug(name) {
  const map = {
    'ا':'a','آ':'a','ب':'b','پ':'p','ت':'t','ث':'s','ج':'j','چ':'ch','ح':'h','خ':'kh',
    'د':'d','ذ':'z','ر':'r','ز':'z','ژ':'zh','س':'s','ش':'sh','ص':'s','ض':'z','ط':'t',
    'ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'gh','ک':'k','گ':'g','ل':'l','م':'m','ن':'n',
    'و':'v','ه':'h','ی':'y',' ':'-','‌':'-'
  };
  return [...String(name).toLowerCase()]
    .map((ch) => (/[a-z0-9]/.test(ch) ? ch : map[ch] ?? ''))
    .join('')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}
```

پنج مرحله: تبدیل به آرایهٔ نویسه (با `[...]` که با یونیکد درست کار
می‌کند)، نگاشت هر نویسه، حذف خط تیره‌های تکراری، حذف خط تیرهٔ ابتدا و
انتها، برش به ۴۰ نویسه.

`map[ch] ?? ''` یعنی نویسه‌های ناشناخته (اعراب، علائم) **حذف** می‌شوند.

نکتهٔ ظریف: `'‌'` (نیم‌فاصله، U+200C) هم در نگاشت هست. «رست‌خانه» بدون
این، به `rstkhaneh` تبدیل می‌شد؛ با آن، `rst-khaneh`.

این فقط یک **پیشنهاد** است و مدیر می‌تواند تغییرش دهد؛ تا وقتی که
`slugTouched` نشده باشد، با تایپ نام به‌روز می‌شود.

### محافظ‌های regex در جست‌وجو

```js
const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
```

این خط در سه فایل تکرار شده (`items.js`, `club.js`, `reports.js`).
همهٔ کاراکترهای خاص regex را escape می‌کند.

بدون این، جست‌وجوی `(a+)+$` می‌توانست یک **ReDoS** (حملهٔ منع سرویس با
regex) بسازد که CPU سرور را قفل کند. و جست‌وجوی `.` همهٔ نتایج را
برمی‌گرداند به‌جای اینکه دنبال نقطه بگردد.

`$&` در رشتهٔ جایگزین یعنی «همان چیزی که تطبیق یافت»، پس `.` به `\.`
تبدیل می‌شود.

---

## ۷.۱۲ نگهبان‌های `ShopContext` — الگوریتمی که هیچ عددی حساب نمی‌کند

این بخش دربارهٔ ریاضی نیست، ولی جایش همین‌جاست: یک الگوریتم **ترتیبی**
است که اگر خراب شود، سبد مشتری بی‌صدا پاک می‌شود — بدون هیچ خطایی، بدون
هیچ لاگی. با مورد ۲۶ سه نگهبان لازم شد و هر سه یک چیز می‌گویند:
«هنوز نه».

### مسئله

نسخهٔ ویت سبد را در همان اولین رندر می‌خواند:

```js
const [cart, setCart] = useState(loadCart);   // ← دیگر این نیست
```

با رندر سمت سرور، همین یک خط سه مسئله می‌سازد و هر سه به یک نتیجه
می‌رسند:

| # | مسئله | نتیجه |
|---|---|---|
| ۱ | روی سرور `localStorage` وجود ندارد | خطا، یا سبدِ همیشه‌خالی در HTML |
| ۲ | سرور سبد خالی می‌فرستد و مرورگر در همان رندر اول سبد پُر می‌سازد | ری‌اکت ناسازگاری می‌بیند و می‌تواند درخت را دور بریزد |
| ۳ | افکتِ **ذخیره** پیش از افکتِ **خواندن** اجرا شود | آرایهٔ خالیِ اولیه روی سبدِ ذخیره‌شده نوشته می‌شود |

### نگهبان یکم — `hydrated`

سبد **همیشه** با آرایهٔ خالی شروع می‌شود، پس HTML سرور و اولین رندر
مرورگر مو به مو یکی‌اند. خواندن در یک افکتِ یک‌باره است و نوشتن پشت
پرچم:

```js
const [cart, setCart] = useState([]);
const [hydrated, setHydrated] = useState(false);

/* خواندن سبدِ ذخیره‌شده، یک بار */
useEffect(() => {
  const saved = loadCart(browserStorage());
  if (saved.length) setCart(saved);
  setHydrated(true);
}, []);

/* نوشتن — نگهبان: پیش از خواندن، هیچ‌وقت ننویس */
useEffect(() => {
  if (!hydrated) return;
  saveCart(browserStorage(), cart);
}, [cart, hydrated]);
```

کامنت کد صریح است: «ترتیب مهم است، نه اینکه چه زمانی اجرا می‌شود.»

بهایش یک فریم است: تا اجرای افکت اول، شمارندهٔ سبد در هدر «۰ گرم» است.
عمداً با `suppressHydrationWarning` پنهان نشده — آن پرچم هشدار را خاموش
می‌کند، نه مسئله را.

`hydrated` از کانتکست هم بیرون داده می‌شود، تا هرچه به سبد بستگی دارد
بتواند تا آن لحظه حالت خنثی نشان بدهد.

### نگهبان دوم — `catalogueComplete`

صفحهٔ اصلی همهٔ کالاها را دارد؛ صفحهٔ یک کالا **عمداً** فقط خودش و
دانه‌هایش را (`fullCatalogue={false}`). خواندن صد و شش کالا برای نشان
دادن یکی بی‌معنی است.

ولی افکتِ پاک‌سازیِ سبد ردیفی را که «کالایش در فهرست نیست» حذف می‌کند.
روی فهرست ناقص، این یعنی **دیدنِ صفحهٔ یک قهوه کل سبد را پاک می‌کرد**.

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

دو شرط اول هر دو لازم‌اند و هر کدام چیز جدایی می‌گویند:

- `catalogueComplete` — روی فهرست ناقص، «کالا در فهرست نیست» دلیلی برای
  حذف نیست.
- `hydrated` — پیش از خوانده شدنِ سبد، «ردیفِ نامعتبر» معنایی ندارد؛
  سبد هنوز خالی است.

و `kept.length === prev.length ? prev : kept` هم عمدی است: اگر چیزی حذف
نشده، **همان آرایهٔ قبلی** برمی‌گردد، نه کپیِ برابرِ آن. وگرنه هر بار که
فهرست کالاها عوض شود ارجاع سبد هم عوض می‌شد و افکتِ نوشتن بی‌جهت اجرا
می‌شد.

### نگهبان سوم — «کامل کردن فهرست»

فهرستِ ناقص فقط یک حالتِ گذراست. سبد مالِ کل سایت است: مشتری می‌تواند دو
قهوه در سبد داشته باشد و بعد صفحهٔ یک ابزار را باز کند. آن‌وقت
`resolved` — که ردیف‌ها را با سند کالا جفت می‌کند — ردیف‌های بی‌جفت را
کنار می‌گذارد، و **`CartDrawer` سفارش را از همین `resolved` می‌سازد**.
یعنی ثبت سفارش از صفحهٔ یک کالا بی‌صدا بقیهٔ ردیف‌ها را می‌انداخت.

```js
const fillTried = useRef(false);

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

سه چیز که این افکت را بی‌خطر می‌کنند:

**۱) حلقه نمی‌سازد.** بعد از `reload()` مقدار `catalogueComplete` روشن
می‌شود و شرط دوم دیگر برقرار نیست. `fillTried` قفل دومی است، برای حالتی
که `reload` خطا بدهد.

**۲) برای بیشتر بازدیدکننده‌ها هیچ کاری نمی‌کند.** شرط
`cart.length === 0` همان اول برمی‌گرداند، پس صفحهٔ کالا برای کسی که سبد
ندارد سبک می‌ماند — یک درخواست، نه دو تا.

**۳) جای «ردیفِ واقعاً حذف‌شده» را نمی‌گیرد.** آن را نگهبان دوم
برمی‌دارد، بعد از اینکه فهرست کامل شد.

### و یک نگهبان چهارم که به سبد ربطی ندارد

`loadOnMount` — تنها جایی که `ShopProvider` هنوز خودش داده می‌خواند:

```js
useEffect(() => {
  if (loadOnMount) reload();
}, [loadOnMount, reload]);
```

فقط پنل مدیریت این پرچم را می‌فرستد، چون صفحه‌هایش سروری نیستند که کسی
فهرست کالاها را برایشان آماده کند — و فرم کالا برای پیش‌نمایش زندهٔ
میکس‌ها به قیمت دانه‌ها نیاز دارد. برای صفحه‌های فروشگاه هیچ‌وقت اجرا
نمی‌شود.

### چرا این‌ها الگوریتم‌اند، نه جزئیات پیاده‌سازی

چون هیچ‌کدام از این شرط‌ها را نمی‌شود با نگاه کردن به صفحه پیدا کرد.
شکستشان **دیده نمی‌شود**: سبد پاک می‌شود و کاربر فکر می‌کند خودش کاری
کرده. به همین دلیل دو تست اختصاصی دارند:

- `tests/cart-storage.test.js` — سبدِ ذخیره‌شده بازاعتبارسنجی می‌شود،
  شناسهٔ ردیف از نو ساخته می‌شود، و حافظهٔ خطادار (حالت خصوصی مرورگر)
  فروشگاه را زمین نمی‌زند.
- `tests/cart-hydration.test.jsx` — یک چرخهٔ کاملِ «رندر سرور ← hydrate»
  اجرا می‌شود و سبد باید دست‌نخورده بیرون بیاید. تنها تستی که یک شکستِ
  نامرئی را می‌گیرد.
