# ۸. سیستم طراحی و استایل

## ۸.۱ فلسفهٔ بصری

کامنت بالای `web/src/style.css` منبع الهام پالت را می‌گوید:

```css
/* ══════════════════════════════════════════════════
   رُست‌خانهٔ دانه — استایل‌نامه
   پالت از خودِ قهوه گرفته شده:
   دانهٔ خام سبز، پوستهٔ گیلاس قرمز، دانهٔ رست‌شدهٔ تیره،
   شیر و کاراملِ فنجان.
   ══════════════════════════════════════════════════ */
```

یعنی هر رنگ در سیستم، معادلی در دنیای واقعی قهوه دارد. این باعث می‌شود
پالت **منسجم** باشد بدون اینکه از یک ابزار تولید پالت آمده باشد.

---

## ۸.۲ توکن‌های طراحی

همهٔ توکن‌ها به‌صورت **متغیر CSS** روی `:root` تعریف شده‌اند
(`web/src/style.css`، خطوط ۸ تا ۳۷):

### پالت رنگ

```css
:root{
  --paper:        #F6EFE3;   /* کاغذ کاهیِ گرم */
  --paper-2:      #EFE4D2;
  --paper-3:      #FBF6EA;
  --line:         #DCCDB4;

  --espresso:     #1E1710;   /* دانهٔ رست تیره */
  --espresso-2:   #2E241A;

  --soft:         #6B5B45;   /* متن فرعی */
  --ink-2:        #4A3E2E;   /* متن معرفی روی زمینهٔ روشن */

  --sage:         #A9B78C;   /* دانهٔ خام */
  --sage-deep:    #5C6B47;
  --cherry:       #B23A2B;   /* گیلاس قهوه */
  --cherry-dark:  #8E2A1E;
  --brass:        #C8963C;   /* برنجِ ترازو */
  --latte:        #C9A87C;   /* شیر و قهوه */
  --crema:        #E8CBA0;
}
```

### جدول کاربرد هر رنگ

| توکن | مقدار | کجا استفاده می‌شود |
|---|---|---|
| `--paper` | `#F6EFE3` | پس‌زمینهٔ `body`، دکمهٔ وزن، منوی موبایل |
| `--paper-2` | `#EFE4D2` | بخش‌های `.soft`، برچسب‌های `.notes`، `.mix-row`، `.club` |
| `--paper-3` | `#FBF6EA` | بدنهٔ کارت‌ها، `.input`، `.search`، فرم باشگاه |
| `--line` | `#DCCDB4` | همهٔ حاشیه‌ها و جداکننده‌ها |
| `--espresso` | `#1E1710` | متن اصلی، `.band`، هدر پنل، چیپ فعال |
| `--espresso-2` | `#2E241A` | نوار اطمینان، hover دکمهٔ سبد |
| `--soft` | `#6B5B45` | متن فرعی، `.section-desc`، `.card-process` |
| `--ink-2` | `#4A3E2E` | `.lead` روی زمینهٔ روشن |
| `--sage` | `#A9B78C` | گرادیان سنجهٔ «سطح مهارت» ابزار |
| `--sage-deep` | `#5C6B47` | `.eyebrow`، `.card-origin`، focus حاشیه، تیک موفقیت |
| `--cherry` | `#B23A2B` | دکمهٔ اصلی، `.badge`، `.mix-val`، `outline` فوکوس |
| `--cherry-dark` | `#8E2A1E` | hover دکمهٔ اصلی، متن خطا |
| `--brass` | `#C8963C` | عدد سبد، `.readout-price`، دستهٔ اسلایدر، مرز پنل |
| `--latte` | `#C9A87C` | گرادیان سنجهٔ رست، زیرعنوان پنل |
| `--crema` | `#E8CBA0` | `.eyebrow` روی زمینهٔ تیره، آیکون نوار اطمینان |

### دو تصمیم دربارهٔ کنتراست

در کد **دو کامنت** وجود دارد که نشان می‌دهد رنگ‌ها بعد از بازبینی
خوانایی تیره‌تر شده‌اند:

```css
/* متن فرعی — کمی تیره‌تر از پالت اولیه، چون رنگ قبلی روی
   زمینهٔ کاهی به‌سختی خوانده می‌شد. */
--soft:         #6B5B45;

--sage-deep:    #5C6B47;   /* تیره‌تر شد تا «تیتر کوچک» خوانا باشد */
```

این نشان می‌دهد دسترس‌پذیری در طراحی لحاظ شده — نه به‌صورت خودکار، اما
به‌صورت آگاهانه.

### توکن‌های غیررنگی

```css
--radius:   16px;
--radius-s: 10px;
--shadow:      0 18px 40px -28px rgba(30,23,16,.5);
--shadow-lift: 0 26px 50px -30px rgba(30,23,16,.62);
--wrap:     1200px;
--ease: cubic-bezier(.22,.61,.36,1);
```

**دو شعاع، نه بیشتر.** `--radius` (۱۶px) برای کارت‌ها و جعبه‌ها،
`--radius-s` (۱۰px) برای فیلدها و برچسب‌ها. عناصر گرد کامل (`.btn`,
`.chip`, `.badge`) از `border-radius: 100px` استفاده می‌کنند.

**سایه با offset منفی.** `-28px` در پارامتر چهارم یعنی سایه کوچک‌تر از
خود عنصر است، پس فقط زیرش دیده می‌شود نه دورش. این «سایهٔ شناور» ظریف‌تر
از سایهٔ یکنواخت است.

**یک تابع easing واحد.** `cubic-bezier(.22,.61,.36,1)` تقریباً معادل
`ease-out` است اما نرم‌تر. استفاده از یک تابع در همهٔ انیمیشن‌ها، حس
یکدستی می‌سازد.

---

## ۸.۳ تایپوگرافی

### دو فونت، و یک لایهٔ واسط

```css
body {
  font-family: var(--font-vazirmatn), system-ui, 'Segoe UI', Tahoma, sans-serif;
  font-size: 16px;
  line-height: 1.85;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4 {
  font-family: var(--font-lalezar), var(--font-vazirmatn), sans-serif;
  font-weight: 400;
  line-height: 1.28;
  margin: 0;
  letter-spacing: 0.2px;
}
```

| فونت | نقش | وزن‌ها |
|---|---|---|
| **Vazirmatn** | متن بدنه، برچسب، دکمه | فونت متغیر — همهٔ وزن‌های ۳۰۰ تا ۹۰۰ |
| **Lalezar** | تیترها، قیمت، عدد بزرگ | فقط ۴۰۰ |

`Lalezar` یک فونت نمایشی فارسی است که فقط یک وزن دارد — به همین دلیل
`font-weight: 400` صریحاً تنظیم شده تا مرورگر فونت مصنوعی
(faux bold) نسازد.

**`line-height: 1.85`** برای متن فارسی عمدی است. خط فارسی به‌خاطر
زیرنویس‌ها و کشیدگی‌ها به فضای عمودی بیشتری از لاتین نیاز دارد.

### چرا نام فونت‌ها در استایل‌نامه نوشته نشده (مورد ۲۵)

تا پیش از مهاجرت، `index.html` یک `<link>` به Google Fonts داشت و
استایل‌نامه فونت‌ها را با اسم صدا می‌زد:

```html
<!-- دیگر وجود ندارد -->
<link href="https://fonts.googleapis.com/css2?family=Lalezar&family=Vazirmatn:wght@300;400;500;700;900&display=swap" rel="stylesheet" />
```

دو مشکل داشت. یکی، یک دامنهٔ سوم در **مسیر بحرانیِ رندر**. و مهم‌تر —
که برای مخاطب این فروشگاه تعیین‌کننده است — دامنه‌ای که برای بسیاری از
کاربران ایرانی کند یا بسته است؛ نتیجه‌اش صفحه‌ای بود که تا تایم‌اوت شدنِ
درخواست با فونت جایگزین دیده می‌شد.

حالا `next/font/google` فایل فونت را **موقع build** می‌گیرد و کنار بقیهٔ
دارایی‌ها می‌گذارد. در زمان اجرا هیچ درخواستی به بیرون نمی‌رود — و
دقیقاً به همین دلیل شد در `web/src/proxy.js` بند `font-src` را روی
`'self'` بست.

`web/src/app/fonts.js`:

```js
export const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  variable: '--font-vazirmatn',
  display: 'swap'
});

export const lalezar = Lalezar({
  subsets: ['arabic', 'latin'],
  weight: '400',
  variable: '--font-lalezar',
  display: 'swap'
});
```

`display: 'swap'` همان معنای قبلی را دارد: متن با فونت جایگزین دیده
می‌شود تا فونت اصلی برسد — بهتر از صفحهٔ خالی. وزیرمتن روی گوگل‌فونتس
فونت **متغیر** است، پس `weight` نمی‌گیرد: همان یک فایل همهٔ وزن‌های
۳۰۰ تا ۹۰۰ را که استایل‌نامه می‌خواهد پوشش می‌دهد. لاله‌زار متغیر نیست
و وزنش اجباری است.

### لایهٔ واسط: متغیر CSS به‌جای نام

نام خانواده‌ای که `next/font` تولید می‌کند **هش‌دار و غیرقابل‌پیش‌بینی**
است (چیزی شبیه `__Vazirmatn_a1b2c3`). پس هیچ‌جای `style.css` و
`admin.css` رشتهٔ `'Vazirmatn'` یا `'Lalezar'` نوشته نمی‌شود؛ همه‌چیز از
راه متغیر می‌آید:

```
app/fonts.js        →  variable: '--font-vazirmatn'
app/layout.jsx      →  <html className={`${vazirmatn.variable} ${lalezar.variable}`}>
style.css / admin.css →  font-family: var(--font-vazirmatn), …
```

کامنت بالای `style.css` این زنجیره را با هشدارش می‌گوید:

> اگر روزی آن دو کلاس از `<html>` برداشته شوند، همهٔ متن سایت به فونت
> جانشین می‌افتد — بی هیچ خطایی.

همین است که فهرست جانشین‌ها را مهم می‌کند: `system-ui, 'Segoe UI',
Tahoma, sans-serif` انتخاب شده چون هر سه روی ویندوز فارسی را با اتصال
حروف درست رندر می‌کنند. یعنی حتی در بدترین حالت، صفحه ناخواناست نه
شکسته.

> **نکته**
> بهایش این است که `npm run build` به شبکه نیاز دارد: فایل فونت‌ها همان
> موقع گرفته می‌شوند. در محیط بی‌اینترنت، **build** شکست می‌خورد — نه
> اجرا. این معاملهٔ آگاهانه‌ای است: یک بار موقع ساخت، به‌جای هر بار
> برای هر بازدیدکننده.

پنل مدیریت یک خانوادهٔ سوم هم دارد که از این زنجیره بیرون است:
`ui-monospace, monospace` برای شناسه‌ها و اعداد لاتین (`slug`، شمارهٔ
سفارش، JSON پیش‌نمایش). آنجا عمداً فونت سیستمی است — هیچ فایلی برایش
دانلود نمی‌شود.

### مقیاس اندازه

مقیاس **سیال** است و با `clamp(min, preferred, max)` کار می‌کند:

| عنصر | اندازه |
|---|---|
| `h1` (تصویر اصلی) | `clamp(2.5rem, 5.6vw, 4.4rem)` |
| `h2` (عنوان بخش) | `clamp(1.9rem, 3.6vw, 2.7rem)` |
| `.readout-price` | `clamp(2rem, 4.4vw, 2.9rem)` |
| `.cat-head h3` | `1.55rem` |
| `.card h3` | `1.4rem` |
| `.price b` | `1.35rem` |
| `.blend-title h3` | `1.3rem` |
| `.scale-title` | `1.15rem` |
| بدنه | `1rem` (۱۶px) |
| `.lead` | `1.03rem` |
| `.section-desc` | `.95rem` |
| `.card-process` | `.8rem` |
| `.eyebrow` | `.78rem` |
| `.field-label` | `.78rem` |
| `.notes li` | `.74rem` |
| `.card-origin` | `.72rem` |
| `.scale-note` | `.72rem` |

**فاصلهٔ حروف** برای متن‌های کوچک بزرگ‌نویس‌مانند:

```css
.eyebrow{ font-size:.78rem; letter-spacing:.14em; }
.card-origin{ font-size:.72rem; letter-spacing:.1em; }
.readout-weight{ font-size:.9rem; letter-spacing:.06em; }
```

هرچه متن کوچک‌تر، فاصلهٔ حروف بیشتر — قاعدهٔ کلاسیک تایپوگرافی که در
فارسی هم کار می‌کند چون این متن‌ها کوتاه‌اند.

### الگوی `logo-text`

```css
.logo-text{
  display:flex; flex-direction:column;
  font-family:var(--font-lalezar),sans-serif; font-size:1.22rem; line-height:1.1;
}
.logo-text em{
  font-family:var(--font-vazirmatn),sans-serif; font-style:normal;
  font-size:.66rem; letter-spacing:.12em; color:var(--soft);
}
```

یک الگوی تکرارشونده در پروژه: عنصر اصلی با فونت نمایشی، `<em>` داخلش با
فونت بدنه و اندازهٔ خیلی کوچک‌تر. همین الگو در `.price`, `.about-facts`,
`.hero-facts` و `.readout-price` تکرار می‌شود.

---

## ۸.۴ فاصله‌گذاری و چیدمان

### هیچ مقیاس عددی رسمی نیست

برخلاف سیستم‌هایی مثل Tailwind که مقیاس ۴px دارند، این پروژه از مقادیر
موردی استفاده می‌کند. اما الگوها منظم‌اند:

| نوع | مقدار |
|---|---|
| ارتفاع بخش | `padding-block: clamp(58px, 7.5vw, 104px)` |
| فاصلهٔ بین کارت‌ها | `gap: 22px` |
| فاصلهٔ بین دسته‌ها | `gap: clamp(34px, 5vw, 56px)` |
| بدنهٔ کارت | `padding: 16px 20px 20px` |
| فاصلهٔ نوار ابزار | `gap: 16px; margin-block-end: 32px` |
| فاصلهٔ فیلدها | `margin-block-end: 14px` |
| گروه اهرم میکس | `gap: 14px` |

اعداد ۶، ۱۰، ۱۲، ۱۴، ۱۶، ۲۰، ۲۲ بیشترین تکرار را دارند.

### شبکه‌ها

```css
.grid-inner{ display:grid; grid-template-columns:repeat(auto-fill,minmax(285px,1fr)); gap:22px; }
.blend-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(330px,1fr)); gap:22px; }
.why-grid{ ... }
```

`auto-fill` + `minmax` یعنی **شبکهٔ واکنش‌گرا بدون media query**. مرورگر
خودش تصمیم می‌گیرد چند ستون جا می‌شود. کارت میکس عریض‌تر است (۳۳۰px) چون
اهرم‌ها فضای بیشتری می‌خواهند.

### چیدمان‌های دوستونه

```css
.hero-inner{ display:grid; grid-template-columns:1.15fr .85fr; align-items:center; }
.club-inner{ display:grid; grid-template-columns:1.05fr .95fr; align-items:center; }
```

نسبت‌های غیر ۵۰/۵۰ عمدی‌اند: در تصویر اصلی، متن فضای بیشتری از «ترازوی
قیمت» می‌گیرد.

### کانتینر

```css
.wrap{ width:min(var(--wrap), 92%); margin-inline:auto; }
```

`min(1200px, 92%)` یعنی: تا ۱۳۰۴px عرض صفحه، ۹۲٪ استفاده می‌شود؛ بعد از
آن ۱۲۰۰px ثابت. `margin-inline` (نه `margin-left/right`) در RTL هم درست
کار می‌کند.

---

## ۸.۵ راست‌به‌چپ — مهم‌ترین جنبهٔ فنی استایل

### ویژگی‌های منطقی به‌جای فیزیکی

کل استایل‌نامه از **CSS Logical Properties** استفاده می‌کند:

| به‌جای | نوشته شده |
|---|---|
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `padding-bottom` | `padding-block-end` |
| `top` / `bottom` | `inset-block-start` / `inset-block-end` |
| `left` / `right` | `inset-inline-start` / `inset-inline-end` |
| `border-bottom` | `border-block-end` |
| `width` (در انیمیشن) | `inline-size` |
| `margin: 0 auto` | `margin-inline: auto` |

نمونه‌ها از کد واقعی:

```css
.nav{ margin-inline-start:auto; }

.skip-link{
  position:absolute; inset-block-start:-100px; inset-inline-start:16px;
}

.cat-head h3{ padding-inline-end:16px; border-inline-end:2px solid var(--line); }

.card-chip{ inset-block-start:12px; inset-inline-start:12px; }
.card-media .badge{ inset-block-start:12px; inset-inline-end:12px; }
```

**چرا این مهم است؟** با `dir="rtl"` روی `<html>`، مرورگر خودکار
`inline-start` را به «راست» و `inline-end` را به «چپ» ترجمه می‌کند. یعنی
**یک استایل‌نامه برای هر دو جهت** کار می‌کند و نیازی به فایل جداگانهٔ
RTL یا ابزار آینه‌کاری (RTLCSS) نیست.

مثال عملی: `.card-chip` (برچسب دسته روی تصویر) در RTL بالا-راست ظاهر
می‌شود و `.badge` بالا-چپ — بدون یک خط کد اضافه.

### جزیره‌های LTR

بعضی محتواها باید همیشه چپ‌به‌راست بمانند. این‌ها صریحاً علامت خورده‌اند:

```jsx
{/* شمارهٔ سفارش */}
<b dir="ltr">{order.code}</b>

{/* شمارهٔ تلفن */}
<span dir="ltr">{order.customer.phone}</span>

{/* شناسهٔ کالا در پنل */}
<small dir="ltr">{item.slug}</small>

{/* فیلدهای ورودی لاتین */}
<input className="input" dir="ltr" value={form.price} />
<input className="input" dir="ltr" autoComplete="username" />
```

و در جدول باشگاه، یک کلاس اختصاصی:

```jsx
<td dir="ltr" className="cell-ltr">{m.phone}</td>
```

**چرا لازم است؟** الگوریتم دوجهته (bidi) یونیکد اعداد را در متن RTL
درست نمایش می‌دهد، اما رشته‌ای مثل `M3K2-8412` را ممکن است به‌هم بریزد
چون خط تیره در جهت خنثی است.

### ورودی‌های عددی

```jsx
<input className="input" dir="ltr" inputMode="numeric" value={c.percent} />
```

`inputMode="numeric"` روی موبایل کیبورد عددی باز می‌کند، و `dir="ltr"`
باعث می‌شود مکان‌نما درست حرکت کند.

---

## ۸.۶ قرارداد نام‌گذاری کلاس‌ها

سیستم **نه BEM است، نه utility** — یک قرارداد میانی و ساده:

### الگوی بلوک-عنصر با خط تیره

```
.card                 بلوک
.card-media           عنصر
.card-body
.card-top
.card-origin
.card-process
.card-foot
.card-chip
.card-grind
.card-more
```

بدون `__` یا `--` مثل BEM؛ فقط خط تیرهٔ ساده.

### حالت‌ها با پیشوند `is-`

```
.is-active    چیپ فیلتر، دکمهٔ وزن، ردیف گزارش
.is-in        کارتی که با اسکرول وارد شده
.is-open      کشو، منو، مودال
.is-off       کالای پنهان، مجموع درصد نادرست
.is-on        سوییچ روشن، toast نمایان
.is-locked    ردیف میکس قفل
.is-current   دکمهٔ وضعیت فعلی سفارش
.is-empty     ردیف بازهٔ بدون سفارش
```

این یکی از قواعد BEM است که حفظ شده و بسیار خواناست: هر کلاسی که با
`is-` شروع شود، یک **حالت موقت** است نه ساختار.

### گونه‌ها با کلاس دوم

```jsx
const CARD_CLASS = { coffee: 'card', gear: 'card card-gear', powder: 'card card-powder' };
```

```css
.card-gear .card-art{ height:158px; }
.card-gear:hover{ border-color:var(--brass); }
.card-powder:hover{ border-color:var(--cherry); }
```

کارت ابزار و پودر **همان کارت قهوه** هستند با چند تفاوت. کامنت CSS این
را می‌گوید:

```css
/* ─── کارت ابزار دم‌آوری ─── */
/* همان کارت قهوه است؛ فقط سنجهٔ رست جای خود را به «سطح مهارت»
   و دکمه‌های وزن جای خود را به «سازگار با» می‌دهد. */
```

همین الگو برای دکمه‌ها: `.btn` + `.btn-primary` / `.btn-ghost` /
`.btn-block`، و چیپ‌ها: `.chip` + `.chip-sm`.

### تفکیک با فضای نام

پنل مدیریت پیشوند `admin-` دارد:

```
.admin-bar   .admin-nav   .admin-link   .admin-page   .admin-head
.admin-sub   .admin-table .admin-row    .admin-cell   .admin-thumb
.admin-btn   .admin-ghost .admin-actions .admin-notice
```

پس هیچ‌وقت با کلاس‌های فروشگاه تداخل نمی‌کند، حتی اگر هر دو CSS در یک
باندل باشند.

---

## ۸.۷ اجزای رابط کاربری

### دکمه

```css
.btn{
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  padding:.72em 1.5em; border-radius:100px; border:1.5px solid transparent;
  font-weight:700; font-size:.95rem; cursor:pointer;
  transition:transform .18s var(--ease), background-color .18s, color .18s,
             border-color .18s, box-shadow .18s;
}
.btn:active{ transform:translateY(1px); }
.btn-primary{ background:var(--cherry); color:#FFF6F2; box-shadow:0 10px 22px -14px rgba(178,58,43,.9); }
.btn-primary:hover{ background:var(--cherry-dark); }
.btn-ghost{ border-color:currentColor; color:var(--espresso); background:transparent; }
.btn-ghost:hover{ background:var(--espresso); color:var(--paper); border-color:var(--espresso); }
```

سه جزئیات:
- **padding با `em`** یعنی دکمه با اندازهٔ فونتش مقیاس می‌گیرد.
- **`border: 1.5px solid transparent`** روی حالت پایه — تا وقتی
  `.btn-ghost` حاشیه می‌گیرد، اندازهٔ دکمه تغییر نکند.
- **`transform: translateY(1px)` روی `:active`** — بازخورد لمسی «فشرده
  شدن».

### چیپ فیلتر

```css
.chip{
  background:transparent; border:1.5px solid var(--line); color:var(--soft);
  border-radius:100px; padding:.42em 1.05em; cursor:pointer; font-size:.88rem;
  display:inline-flex; align-items:center; gap:7px;
}
.chip b{ font-size:.72rem; font-weight:700; background:var(--paper-2); color:var(--soft);
         border-radius:100px; padding:0 .5em; }
.chip.is-active{ background:var(--espresso); border-color:var(--espresso); color:var(--paper); }
.chip.is-active b{ background:var(--brass); color:var(--espresso); }
```

نکتهٔ خوب: عدد داخل چیپ (`<b>`) در حالت فعال به **برنجی** تغییر می‌کند —
پس هم چیپ و هم شمارنده‌اش با هم حالت عوض می‌کنند.

### سنجهٔ پنج‌تایی

```css
.roast-bar{ display:flex; gap:4px; margin-block-start:6px; }
.roast-bar i{ height:7px; flex:1; border-radius:100px; background:var(--paper-2); }
.roast-bar i.on{ background:linear-gradient(90deg,var(--latte),var(--espresso)); }

.level-bar i.on{ background:linear-gradient(90deg,var(--sage),var(--sage-deep)); }
```

یک کامپوننت، سه معنی:

| نوع کالا | برچسب | رنگ |
|---|---|---|
| قهوه | درجهٔ رست | قهوه‌ای (لاته → اسپرسو) |
| ابزار | سطح مهارت لازم | سبز (`.level-bar`) |
| پودر | شدت طعم | قهوه‌ای (`.taste-bar`) |

و در JSX:

```jsx
<div className={`roast-bar ${kind.meterClass}`.trim()}
     role="img" aria-label={`${kind.meterLabel} ${toFa(item.meter)} از ۵`}>
  {[1,2,3,4,5].map((i) => <i key={i} className={i <= item.meter ? 'on' : ''} />)}
</div>
```

`role="img"` + `aria-label` این نوار بصری را برای screen reader معنادار
می‌کند.

### اسلایدر سفارشی

```css
.range{
  -webkit-appearance:none; appearance:none;
  width:100%; height:6px; border-radius:100px;
  background:linear-gradient(90deg,var(--crema),var(--espresso));
  cursor:pointer;
}
.range::-webkit-slider-thumb{
  -webkit-appearance:none; width:26px; height:26px; border-radius:50%;
  background:var(--brass); border:3px solid var(--paper-3); cursor:grab;
  box-shadow:0 4px 10px rgba(0,0,0,.3);
}
.range::-moz-range-thumb{
  width:22px; height:22px; border-radius:50%;
  background:var(--brass); border:3px solid var(--paper-3); cursor:grab;
}
```

هر دو موتور پوشش داده شده. گرادیان پس‌زمینه از کِرِما به اسپرسو،
استعارهٔ درجهٔ رست را تکرار می‌کند.

### «ترازوی قیمت» — امضای بصری صفحه

```css
.scale{
  background:linear-gradient(170deg,#FCF7EC,#E7DAC2);
  border-radius:22px; padding:24px;
  box-shadow:0 34px 66px -30px rgba(0,0,0,.8);
  border:1px solid rgba(255,255,255,.7);
}
.scale-dot{
  width:9px; height:9px; border-radius:50%; background:var(--sage-deep);
  box-shadow:0 0 0 4px rgba(110,127,87,.2); animation:pulse 2.6s infinite;
}
@keyframes pulse{ 50%{ box-shadow:0 0 0 8px rgba(110,127,87,0); } }

.readout{
  background:var(--espresso); color:var(--paper);
  border-radius:var(--radius); padding:18px 20px; text-align:center;
  box-shadow:inset 0 2px 14px rgba(0,0,0,.45);
}
.readout-price{ font-family:var(--font-lalezar),sans-serif; font-size:clamp(2rem,4.4vw,2.9rem); color:var(--brass); }
```

این تنها جایی است که `border-radius: 22px` استفاده می‌شود (نه توکن) —
عمدی، چون این عنصر باید متمایز باشد.

`box-shadow: inset` روی صفحهٔ نمایش عدد، حس **صفحهٔ فرورفتهٔ ترازوی
دیجیتال** می‌سازد.

`@keyframes pulse` با حلقهٔ سایه، چراغ «روشن بودن» ترازو را شبیه‌سازی
می‌کند.

---

## ۸.۸ جزئیات بصری خاص

### بافت کاغذ روی کل صفحه

```css
body::after{
  content:""; position:fixed; inset:0; z-index:3; pointer-events:none; opacity:.05;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>");
}
```

یک SVG با فیلتر `feTurbulence` (نویز فراکتال) به‌صورت **data-URI** روی
کل صفحه با شفافیت ۵٪ نشسته است.

- `position: fixed; inset: 0` — با اسکرول حرکت نمی‌کند، پس حس «کاغذی که
  صفحه رویش چاپ شده» می‌دهد.
- `pointer-events: none` — کلیک‌ها از آن رد می‌شوند.
- بدون درخواست شبکه.

### گلاس‌مورفیسم

```css
.site-header{
  position:sticky; inset-block-start:0; z-index:40;
  background:rgba(246,239,227,.88);
  backdrop-filter:blur(12px);
  border-block-end:1px solid var(--line);
}

.card-chip{
  background:rgba(30,23,16,.72); color:var(--paper);
  backdrop-filter:blur(4px);
}
```

هدر نیمه‌شفاف با تاری پس‌زمینه، و برچسب دسته روی تصویر کارت هم همین
تکنیک را با شدت کمتر دارد.

### منحنی رست در تصویر اصلی

```jsx
<svg className="roast-curve" viewBox="0 0 800 260" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0,240 C140,238 210,150 300,110 S520,62 800,34" fill="none" stroke="currentColor" strokeWidth="2" />
  <path d="M0,255 C140,252 210,180 300,145 S520,110 800,86" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 7" opacity=".5" />
</svg>
```

```css
.roast-curve{
  position:absolute; inset-block-end:0; inset-inline:0; width:100%; height:55%;
  color:var(--brass); opacity:.3; pointer-events:none;
}
.roast-curve #curveLine{ stroke-dasharray:1400; stroke-dashoffset:1400; animation:draw 2.4s var(--ease) .3s forwards; }
@keyframes draw{ to{ stroke-dashoffset:0; } }
```

این یک **نمودار منحنی رست** واقعی است (دما بر حسب زمان) که به‌عنوان
عنصر تزئینی پس‌زمینه به کار رفته — جزئیاتی که فقط کسی که با قهوه آشناست
تشخیص می‌دهد.

`preserveAspectRatio="none"` یعنی منحنی با عرض صفحه کشیده می‌شود.

> **نکته**
> انیمیشن `draw` روی `#curveLine` تعریف شده، اما در نسخهٔ React هیچ
> عنصری این `id` را ندارد. یعنی این قاعدهٔ CSS **بی‌اثر** است — بازماندهٔ
> نسخهٔ ایستای اولیه.

### انیمیشن ورود کارت‌ها

```css
.card{
  opacity:0; transform:translateY(16px);
  transition:opacity .5s var(--ease), transform .5s var(--ease),
             border-color .2s, box-shadow .3s;
}
.card.is-in{ opacity:1; transform:none; }
.card:hover{ border-color:var(--sage-deep); box-shadow:var(--shadow-lift); transform:translateY(-3px); }
```

کارت‌ها با شفافیت صفر و ۱۶px پایین‌تر شروع می‌کنند. هوک `useReveal`
کلاس `.is-in` را اضافه می‌کند.

**رنگ حاشیهٔ hover با نوع کالا فرق می‌کند:**
قهوه → `--sage-deep` · ابزار → `--brass` · پودر → `--cherry`

### طرح رنگ دانه در راهنمای رست

```jsx
const GUIDE_CARDS = [
  { filter: 'light',  level: '1', fill: '#D3A468', stroke: '#8E5C2A', title: 'روشن', ... },
  { filter: 'medium', level: '3', fill: '#9C6B3C', stroke: '#C79763', title: 'متوسط', ... },
  { filter: 'dark',   level: '5', fill: '#3B2213', stroke: '#84543A', title: 'تیره', ... },
  { filter: 'decaf',  level: 'd', fill: '#7E8A63', stroke: '#E4EBD2', title: 'بدون کافئین', ... }
];
```

این رنگ‌ها با `ROAST_TONE` در `art.js` هماهنگ‌اند: `#D3A468` دقیقاً همان
رنگ دانهٔ `meter: 1` است. یعنی کارت راهنما و کارت محصول **یک زبان بصری**
دارند.

---

## ۸.۹ واکنش‌گرایی

### نقاط شکست فروشگاه

```css
@media (max-width:1000px){
  .gallery{ grid-auto-rows:170px; }
}

@media (max-width:960px){
  .hero-inner{ grid-template-columns:1fr; }
  .hero-photo{ object-position:60% center; }
  .bulk-inner{ grid-template-columns:1fr; }
  .story-inner{ grid-template-columns:1fr; }
  .footer-inner{ grid-template-columns:1fr 1fr; }
  .toolbar{ align-items:flex-start; }
  .club-inner{ grid-template-columns:1fr; }
  .about-top{ grid-template-columns:1fr; }
}

@media (max-width:760px){
  .btn-burger{ display:block; }
  .nav{
    position:absolute; inset-block-start:100%; inset-inline:0;
    flex-direction:column; gap:0; background:var(--paper);
    max-height:0; overflow:hidden; transition:max-height .3s var(--ease);
  }
  .nav.is-open{ max-height:520px; overflow-y:auto; }
  .site-header{ position:relative; }
  .btn-cart span{ display:none; }
  .blend-grid{ grid-template-columns:1fr; }
  .sheet-head{ flex-direction:column; }
  .taste-chip{ flex:1 1 44%; }
  ...
}
```

سه نقطهٔ شکست، هرکدام با هدف مشخص:

| نقطه | چه اتفاقی می‌افتد |
|---|---|
| `1000px` | ارتفاع گالری کم می‌شود |
| `960px` | همهٔ چیدمان‌های دوستونه تک‌ستونه می‌شوند |
| `760px` | منوی برگر، شبکه‌های تک‌ستونه، پنهان کردن متن‌های ثانویه |

**دو جزئیات هوشمندانه در `760px`:**

۱) `.site-header{ position:relative; }` — هدر از چسبان بودن درمی‌آید.
   دلیل: منوی موبایل با `position: absolute` نسبت به هدر باز می‌شود و
   اگر هدر چسبان بماند، منو روی محتوا گیر می‌کند.

۲) `.btn-cart span{ display:none; }` — کلمهٔ «سبد» حذف می‌شود اما آیکون
   و عدد می‌مانند. صرفه‌جویی در فضا بدون از دست دادن اطلاعات.

### منوی موبایل با `max-height`

```css
.nav{ max-height:0; overflow:hidden; transition:max-height .3s var(--ease); }
.nav.is-open{ max-height:520px; overflow-y:auto; }
```

انیمیشن روی `max-height` (نه `height: auto` که قابل انیمیشن نیست).
مقدار ۵۲۰px از ارتفاع واقعی ده لینک بیشتر است تا همیشه جا شود.

### شبکه‌های خود-واکنش‌گرا

بسیاری از چیدمان‌ها **اصلاً media query لازم ندارند**:

```css
.grid-inner{ grid-template-columns:repeat(auto-fill,minmax(285px,1fr)); }
```

از دسکتاپ چهارستونه تا موبایل یک‌ستونه، همه با یک خط.

### کاهش حرکت

```css
@media (prefers-reduced-motion:reduce){
  *{
    animation-duration:.01ms !important;
    animation-iteration-count:1 !important;
    transition-duration:.01ms !important;
  }
  html{ scroll-behavior:auto; }
  .card{ opacity:1; transform:none; }
}
```

سه لایه: همهٔ انیمیشن‌ها تقریباً آنی، پیمایش نرم خاموش، و کارت‌ها فوراً
نمایان.

خط آخر حیاتی است: بدون آن، کارت‌ها با `opacity: 0` می‌ماندند چون
`transition` حذف شده اما حالت اولیه نه.

و همین بررسی در جاوااسکریپت هم تکرار شده (`useReveal.js`):

```js
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  cards.forEach((c) => c.classList.add('is-in'));
  return;
}
```

---

## ۸.۱۰ استایل چاپ رسید

این تنها جای پروژه است که یک **رسانهٔ دوم** طراحی می‌شود. همه‌چیزش در
`admin.css` است، بعد از استایل رسید و پیش از پوستهٔ پنل، و میزبانش
`web/src/components/PrintSheet.jsx`.

هدفش در کامنت بالای بلوک نوشته شده:

> هدف: یک برگ A4 برای سفارش‌های معمولی، و برای سفارش بلند، شکستنِ تمیز
> — نه سرصفحهٔ تنها، نه ردیفی که وسطش دو نیم شود.

### یک خط که همه‌چیز را ممکن می‌کند

```css
.print-sheet {
  display: none;
}

@media print {
  body.has-print-sheet > *:not(.print-sheet) {
    display: none !important;
  }

  .print-sheet {
    display: block !important;
    font-size: 10pt;
    line-height: 1.5;
    orphans: 3;
    widows: 3;
  }
}
```

بیرون از چاپ، میزبان پنهان است. داخل چاپ، **هر فرزند دیگرِ `body`**
برداشته می‌شود و فقط همان می‌ماند.

سه چیز این سادگی را می‌سازند و هیچ‌کدام CSS نیستند:

**۱) رسید فرزندِ مستقیم `body` است.** `PrintSheet` با `createPortal`
یک بار دیگر رندرش می‌کند، بیرون از درخت صفحه. بدون این، قاعده باید
نیاکانِ رسید را پنهان می‌کرد — و هر نیایی که پنهان شود خودِ رسید را هم
می‌برد.

**۲) کلاس `has-print-sheet` روی `body`.** بدون این شرط، قاعده روی
**هر** صفحه‌ای برقرار بود و `Ctrl+P` روی خودِ فروشگاه یک برگ سفید
می‌داد. کلاس را `PrintSheet` موقع mount می‌گذارد و موقع unmount
برمی‌دارد.

**۳) `orphans`/`widows: 3`** — سه سطر تنها در بالا یا پایین صفحه
نماند.

### چرا `display: none` و نه `visibility` — و ۳۳ صفحه‌ای که پشتش بود

نسخهٔ پیشین دقیقاً برعکس بود:

```css
/* نسخهٔ قدیمی — دیگر در پروژه نیست */
@media print{
  body *{ visibility:hidden !important; }
  .drawer, .drawer *{ visibility:visible !important; }
  .drawer{ position:absolute !important; transform:none !important; … }
}
```

منطقش موجه به‌نظر می‌رسید: کشوی سبد چند لایه داخل صفحه است، پس به‌جای
پنهان کردن فرزندانِ `body`، همه‌چیز نامرئی می‌شد و بعد فقط کشو
برمی‌گشت — این‌طور جایگاه لایه‌های والد به‌هم نمی‌ریخت و
`position: absolute` کشو مرجع درستی داشت.

**ولی `visibility` عنصر را از چیدمان حذف نمی‌کند.** فقط رنگش را
برمی‌دارد. کل فروشگاه — هدر، سه فهرست کالا، ده‌ها کارت و SVGهایشان،
متن‌های «دربارهٔ ما»، فوتر — همچنان ارتفاعِ واقعیِ خودشان را داشتند و
مرورگر همان ارتفاع را صفحه‌بندی می‌کرد.

نتیجه اندازه‌گیری شد: **۳۳ صفحه، که ۳۱ تای آخرش کاغذ سفیدِ خالی بود.**

`display: none` همان چیزی است که واقعاً لازم بود — و به‌محض اینکه رسید
فرزندِ مستقیم `body` شد، هیچ مانعی برای استفاده‌اش نماند. ارتفاع سند
حالا دقیقاً ارتفاع خودِ رسید است.

### فرق‌های سبک چاپ با سبک نمایشگر

| | نمایشگر | کاغذ |
|---|---|---|
| رنگ | پالت کامل (`--espresso`، `--cherry`، `--paper`) | `#000` روی `#fff`، بی‌استثنا |
| زمینه و سایه | بافت کاغذ، `box-shadow`، گلاس‌مورفیسم | `transparent`، `box-shadow: none`، `filter: none` |
| واحد اندازه | `rem` و `vw` | `pt` — تنها واحدی که چاپگر می‌فهمد |
| جداکننده | `border-radius` و رنگ ملایم | خط‌های `solid`/`dotted` سیاه |
| قاب | `.receipt-sheet` کادر و padding دارد | کادر و padding هر دو صفر |
| جهت | RTL از `dir` روی `<html>` | **همان** — دست نمی‌خورد |

آن سطر آخر مهم است: سبک چاپ **هیچ کاری با جهت نمی‌کند**. `dir="rtl"`
روی `<html>` است و همهٔ فاصله‌ها منطقی‌اند (`margin-inline-start`،
`border-block-end`)، پس راست‌به‌چپ خودبه‌خود به کاغذ می‌رسد.

```css
.print-sheet,
.print-sheet * {
  background: transparent !important;
  color: #000 !important;
  box-shadow: none !important;
  text-shadow: none !important;
  filter: none !important;
}
```

`* ` اینجا موجه است: هیچ رنگی نباید از قلم بیفتد. رنگ‌های برند روی کاغذ
یا جوهر هدر می‌دهند یا خاکستریِ ناخوانا می‌شوند.

### کاغذ، و چه چیزی روی آن نمی‌آید

```css
@page {
  size: A4;
  margin: 12mm;
}
```

۱۸۶×۲۷۳ میلی‌متر فضای مفید — برای رسیدِ چندردیفه با ته‌مانده جا می‌ماند.

```css
html, body {
  background: #fff !important;
  color: #000 !important;
  margin: 0 !important;
  padding: 0 !important;
  block-size: auto !important;
  overflow: visible !important;
}
```

`overflow: visible` لازم است چون کشوی سبد موقع باز بودن اسکرول `body`
را قفل می‌کند — و چاپ معمولاً درست وقتی اتفاق می‌افتد که کشو باز است.

دو چیز عمداً حذف می‌شوند، چون فقط روی نمایشگر معنی دارند:

```css
.print-sheet .order-done-mark,
.print-sheet .receipt-foot {
  display: none !important;
}
```

تیکِ سبزِ «ثبت شد» یک تزئین است، و `.receipt-foot` نوشته «این رسید را
می‌توانید چاپ کنید یا از آن عکس بگیرید» — جمله‌ای که روی خودِ کاغذ
بی‌معنی است. لینک‌ها هم زیرخطشان را از دست می‌دهند
(`.print-sheet a { text-decoration: none }`): نشانی‌شان به درد
نمی‌خورد، چون رسید شمارهٔ سفارش را دارد.

### شکستن صفحه — چهار چیز که نباید دو نیم شوند

مهم‌ترین بخشِ این سبک، و چیزی که سبک قبلی اصلاً نداشت.

```css
/* سرصفحه هیچ‌وقت آخرین چیزِ یک صفحه نباشد */
.print-sheet .receipt-h {
  break-after: avoid;
  page-break-after: avoid;
}

/* یک ردیف سفارش — با آسیاب و ترکیب میکسش — یک واحد است */
.print-sheet .receipt-lines > li,
.print-sheet .receipt-mix,
.print-sheet .receipt-block {
  break-inside: avoid;
  page-break-inside: avoid;
}

/* جمع‌ها یک تکه‌اند: «مبلغ قابل پرداخت» نباید تنها سرِ صفحهٔ بعد بیفتد */
.print-sheet .totals { break-inside: avoid; page-break-inside: avoid; }

/* راه تماس فروشگاه — همیشه با هم */
.print-sheet .receipt-contact { break-inside: avoid; page-break-inside: avoid; }
```

هر قاعده **دو بار** نوشته شده: `break-inside` استاندارد امروز است و
`page-break-inside` نامِ قدیمی‌اش. موتورهای چاپ عقب‌تر از موتورهای
نمایش‌اند و این یکی از معدود جاهایی است که تکرار ارزش دارد.

### مقیاس تایپوگرافی روی کاغذ

| عنصر | اندازه | چرا |
|---|---|---|
| بدنهٔ برگه | `10pt` | چگالی متعارف سند اداری |
| عنوان بالا (`.order-done h3`) | `13pt` | تنها تیتر برگه |
| شمارهٔ سفارش | `12pt` | چیزی که مشتری پای تلفن می‌خواند |
| «مبلغ قابل پرداخت» | `12pt` | هم‌وزن شمارهٔ سفارش، عمداً |
| سرصفحه‌ها (`.receipt-h`) | `11pt` | یک پله بالاتر از متن |
| فراداده، میکس، تماس | `9pt` | خوانا، ولی در حاشیه |

دو چیز هم‌اندازه‌اند و این تصادفی نیست: **شمارهٔ سفارش** و **مبلغ قابل
پرداخت** — دو عددی که هر کسی روی یک رسید دنبالشان می‌گردد.

`.order-code` و `.receipt-date` هم روی کاغذ `display: inline` می‌شوند
و در یک خط کنار هم می‌نشینند، جایی که روی نمایشگر دو بلوک جدا بودند.
یک سطر کمتر، و سرصفحهٔ برگه جمع‌وجورتر.

---

## ۸.۱۱ دسترس‌پذیری در سطح CSS

### حلقهٔ فوکوس

```css
:focus-visible{
  outline:3px solid var(--cherry);
  outline-offset:3px;
  border-radius:4px;
}
```

`:focus-visible` (نه `:focus`) یعنی حلقه فقط برای کاربر صفحه‌کلید ظاهر
می‌شود، نه هنگام کلیک با موس. ضخامت ۳px و `outline-offset` آن را کاملاً
قابل تشخیص می‌کند.

### پیوند پرش

```css
.skip-link{
  position:absolute; inset-block-start:-100px; inset-inline-start:16px; z-index:100;
  background:var(--espresso); color:var(--paper); padding:10px 16px;
  border-radius:0 0 10px 10px;
}
.skip-link:focus{ inset-block-start:0; }
```

بالای صفحه پنهان است و با اولین Tab ظاهر می‌شود:
«رفتن به فهرست قهوه‌ها».

### احترام به `hidden`

```css
/* صفت hidden باید همیشه برنده باشد؛ وگرنه display دلخواه کلاس‌ها آن را بی‌اثر می‌کند */
[hidden]{ display:none !important; }
```

مشکل کلاسیک: `<div hidden class="drawer">` که `.drawer{ display: flex }`
دارد، همچنان دیده می‌شود چون کلاس بر صفت `hidden` غلبه می‌کند. این قاعده
آن را می‌بندد — و در `CartDrawer` واقعاً استفاده می‌شود:

```jsx
<aside className={`drawer ${open ? 'is-open' : ''}`} hidden={!open}>
```

---

## ۸.۱۲ استایل پنل مدیریت

`admin.css` همان توکن‌ها را به ارث می‌برد اما چیدمان کاری‌تری دارد:

```css
.admin-bar{
  position:sticky; inset-block-start:0; z-index:50;
  background:var(--espresso); color:var(--paper);
  border-block-end:3px solid var(--brass);
}
```

نوار تیره با مرز برنجی ۳px — تمایز بصری فوری بین پنل و فروشگاه.

جدول کالاها یک **شبکه** است، نه `<table>`:

```jsx
<div className="admin-table" role="table">
  <div className="admin-row admin-row-head" role="row">
```

با `role` های ARIA برای حفظ معنا. دلیل انتخاب grid به‌جای table،
انعطاف چیدمان در نقاط شکست است.

نقاط شکست پنل: `1080px`, `900px`, `760px` — متفاوت از فروشگاه، چون
محتوای متراکم‌تری دارد.
