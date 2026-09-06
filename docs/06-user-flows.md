# ۶. جریان‌های اصلی کاربر

این فصل ده جریان کامل را از اولین کلیک تا آخرین درج در پایگاه داده دنبال
می‌کند، و با نمودار وضعیت سفارش تمام می‌شود. برای هر مرحله، **فایل و تابع
دقیق** ذکر شده است.

سه جریان با مورد ۲۶ و ۲۷ و ۳۵ عوض شدند یا تازه‌اند و علامت خورده‌اند:
بارگذاری اولیه (۶.۱)، صفحهٔ کالا و مودالش (۶.۳)، و پیگیری سفارش (۶.۶).
جریان هم‌رسانی کالا (۶.۱۱) از همه تازه‌تر است، و گامِ چاپِ رسید در ۶.۵
از پایه بازنویسی شد.

---

## ۶.۱ جریان اول — بارگذاری اولیهٔ صفحه

این جریان بیش از هر جریان دیگری با مورد ۲۶ عوض شد، پس اول تفاوت را
صریح بگوییم.

**پیش‌تر (ویت):** مرورگر یک `index.html` تقریباً خالی می‌گرفت، بعد باندل
جاوااسکریپت را دانلود و اجرا می‌کرد، بعد `ShopContext` موقع mount دو
درخواست به `/api/items` و `/api/content` می‌فرستاد، و بعد اولین قهوه
دیده می‌شد. سه رفت‌وبرگشت.

**حالا:** همان دو درخواست روی **سرور** انجام می‌شوند و نتیجه‌شان داخل
همان HTML اول است. یک رفت‌وبرگشت.

### نمودار توالی

```
مرورگر        app/page.jsx      lib/data.js        Express            MongoDB
   │                │                │                │                  │
   │─ GET / ───────►│                │                │                  │
   │                │                │                │                  │
   │                │ Promise.all([ getItems(), getContent() ])           │
   │                │───────────────►│                │                  │
   │                │                │─ fetch مطلق ──►│─ find({active}) ─►│
   │                │                │  API_URL       │◄─────────────────│
   │                │                │  cache:no-store│─ Content.find() ─►│
   │                │◄─ کالاها + متن‌ها ┤◄───────────────│◄─────────────────│
   │                │                │                │                  │
   │                │ ShopProvider initialItems / initialContent          │
   │                │ HomeShell → کارت‌ها، بخش‌ها، JSON-LD                 │
   │                │ generateMetadata → <head> واقعی                     │
   │◄─ HTML کامل ───┤                │                │                  │
   │                                                                     │
   │ hydrate: همان درخت، سبد **خالی** — مو به مو مثل HTML سرور            │
   │ افکتِ یک‌باره: loadCart(browserStorage()) → setHydrated(true)         │
   │ شمارندهٔ هدر یک فریم بعد درست می‌شود                                  │
```

### مرحله‌به‌مرحله

**۱) `web/src/proxy.js`** پیش از هر چیز اجرا می‌شود: یک `nonce` تازه
می‌سازد، روی هدر درخواست می‌گذارد (تا Next روی اسکریپت‌های خودش
بنشاندش) و سیاست امنیتی را روی پاسخ.

**۲) `web/src/app/layout.jsx`** پوستهٔ صفحه را می‌سازد: `lang="fa"`،
`dir="rtl"` (هر دو از `shared/seo.js`)، کلاس‌های فونتِ `next/font` روی
`<html>`، و دو شکاف — `children` و `modal`.

**۳) `web/src/app/page.jsx`** — کامپوننت **سروری**. اینجاست که داده
خوانده می‌شود:

```jsx
export default async function HomePage() {
  /* هر دو با هم، نه یکی پس از دیگری */
  const [items, content] = await Promise.all([getItems(), getContent()]);
  const nonce = (await headers()).get('x-nonce') || undefined;

  const orgJsonLd = content?.about ? asJsonLd(organizationSchema(content)) : '';

  return (
    <ShopProvider initialItems={items} initialContent={content}>
      <HomeShell />
      {orgJsonLd ? (
        <script type="application/ld+json" nonce={nonce}
                dangerouslySetInnerHTML={{ __html: orgJsonLd }} />
      ) : null}
    </ShopProvider>
  );
}
```

سه چیز در همین چند خط:

- داده به‌شکل **prop** از مرز سروری به مشتری رد می‌شود — همان چیزی که
  تا دیروز با `fetch` در مرورگر گرفته می‌شد.
- `LocalBusiness` اگر مدیر بخش «دربارهٔ ما» را پر نکرده باشد **اصلاً
  منتشر نمی‌شود**: نشانیِ خالی در دادهٔ ساختاریافته از نبودش بدتر است.
- `nonce` از همان چیزی می‌آید که `proxy.js` روی درخواست گذاشته. بدون
  آن، سیاست امنیتی این `<script>` را هم می‌بست — هرچند داده است و اجرا
  نمی‌شود.

**۴) `web/src/lib/data.js`** روی سرور می‌خواند، با آدرس مطلق و
`cache: 'no-store'`:

```js
export const getItems = cache(async (kind = '') => {
  const res = await fetch(`${API_URL}/api/items${kind ? `?kind=${kind}` : ''}`, FETCH_OPTS);
  if (!res.ok) throw new Error(`خطای سرور (${res.status})`);
  return res.json();
});
```

`cache` از ری‌اکت است، نه کش HTTP: در طول **یک درخواست** هر بار که
همین تابع صدا زده شود فقط یک بار از سرور پرسیده می‌شود. برای صفحهٔ
اصلی مهم نیست؛ برای صفحهٔ کالا هست، چون `generateMetadata` و خودِ صفحه
هر دو همان کالا را می‌خواهند.

**۵) سرور** — `GET /api/items`:

```js
const filter = { active: true };
if (req.query.kind) filter.kind = req.query.kind;
const items = await Item.find(filter).sort({ rank: 1, name: 1 }).lean({ virtuals: true });
```

و `GET /api/content` که هفت کلید را با fallback به `DEFAULT_CONTENT`
برمی‌گرداند. نبودِ متن‌ها صفحه را زمین نمی‌زند: `getContent` در خطا `{}`
می‌دهد.

**۶) `ShopProvider`** دیگر خودش نمی‌خواند. `initialItems` و
`initialContent` را می‌گیرد، `loading` از همان اول `false` است، و
ساختارهای مشتق ساخته می‌شوند: `bySlug` (Map)، `byKind` (سه آرایه)،
`houseBlends` (میکس‌های `house`، مرتب با `rank`).

> شاخه‌های «در حال خواندن…» حذف **نشده‌اند**، چون `reload()` هنوز وجود
> دارد و پس از آن ممکن است لازم شوند. ولی در بارگذاری اولیه هیچ‌وقت
> دیده نمی‌شوند.

**۷) `HomeShell.jsx`** — `'use client'`، چون فیلترهای دسته بالای چند
بخش زندگی می‌کنند. این به معنای «سمت مشتری رندر شدن» نیست: متن همهٔ
بخش‌ها داخل همان HTML اول است.

**۸) hydration — حساس‌ترین نقطهٔ این جریان.** سبد **همیشه با آرایهٔ
خالی** شروع می‌شود، پس HTML سرور و اولین رندر مرورگر مو به مو یکی‌اند.
خواندن واقعی در یک افکتِ یک‌باره است:

```js
useEffect(() => {
  const saved = loadCart(browserStorage());
  if (saved.length) setCart(saved);
  setHydrated(true);
}, []);
```

بهایش یک فریم است: تا اجرای این افکت، شمارندهٔ سبد در هدر «۰ گرم»
نشان می‌دهد. عمداً با `suppressHydrationWarning` پنهان نشده — آن پرچم
هشدار را خاموش می‌کند، نه مسئله را. سه نگهبانی که این ترتیب لازم دارد
در ۷.۱۲ خط‌به‌خط آمده‌اند.

**۹) نشست مدیر اینجا نیست.** در نسخهٔ ویت `AuthProvider` دور کل برنامه
می‌پیچید و همان اول `api.me()` را صدا می‌زد. حالا فقط در
`app/admin/layout.jsx` است، پس بازدیدکنندهٔ فروشگاه هیچ درخواستی برای
بررسی نشست نمی‌فرستد و کد پنل هم برایش دانلود نمی‌شود.

**۱۰) رفع باگ لنگر** — جزئیاتی که ماند، ولی دلیلش عوض شد:

```js
useEffect(() => {
  if (loading || loadError) return;
  const id = window.location.hash.slice(1);
  if (!id) return;
  const t = setTimeout(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'auto' });
  }, 60);
  return () => clearTimeout(t);
}, [loading, loadError]);
```

کامنت `HomeShell.jsx` تفاوت را می‌گوید:

> اگر آدرس با لنگر باز شده باشد (مثل `/#cafe`)، مرورگر همان اول صفحه را
> جابه‌جا می‌کند. در نسخهٔ ویت آن لحظه هنوز فهرست کالاها نیامده بود و
> بخش‌ها کوتاه‌تر بودند، پس جای اشتباهی می‌ایستاد. حالا داده از همان اول
> در HTML است و بخش‌ها ارتفاع نهایی خودشان را دارند — ولی تصویرها ممکن
> است هنوز نرسیده باشند، پس همان یک فریم صبر سر جایش می‌ماند.

یعنی همان شصت میلی‌ثانیه ماند، ولی از «منتظر داده» به «منتظر چیدمان
تصویرها» تبدیل شد.

---

## ۶.۲ جریان دوم — مرور، فیلتر و افزودن یک قهوهٔ ساده

### نمودار جریان

```
   ┌──────────────────┐
   │ CatalogSection   │  kind="coffee"
   │ (byKind.coffee)  │
   └────────┬─────────┘
            │
     ┌──────▼──────┐   filter === 'all' ؟
     │ فیلتر دسته  │   → p.group === filter
     └──────┬──────┘
            │
     ┌──────▼───────────────┐   debounce ۱۶۰ms
     │ جست‌وجو در ۶ منبع    │   name + origin + spec + notes + pairs + برچسب دسته
     └──────┬───────────────┘
            │
     ┌──────▼──────┐   rank | price-asc | price-desc
     │ مرتب‌سازی    │   meter-asc | meter-desc | name (localeCompare 'fa')
     └──────┬──────┘
            │
      grouped = filter==='all' && sort==='rank' && !query
            │
     ┌──────▼───────────────────────┐
     │ بله → دسته‌بندی زیر عنوان     │
     │ خیر → یک شبکهٔ تخت            │
     └──────┬───────────────────────┘
            │
     ┌──────▼──────┐
     │  ItemCard   │ ← useReveal(): IntersectionObserver → .is-in
     └──────┬──────┘
            │  کاربر: وزن، آسیاب، «افزودن»
     ┌──────▼──────────────────────┐
     │ addWeighed(slug, grams, {grind}) │
     └──────┬──────────────────────┘
            │
     ┌──────▼───────────────────────────────┐
     │ key = `${slug}|${grind}|${mixSig}`    │
     │ ردیف موجود؟ → grams += grams          │
     │ وگرنه       → push ردیف تازه          │
     │ toast(...)                            │
     └──────┬───────────────────────────────┘
            │
     ┌──────▼──────────────────────┐
     │ useEffect → localStorage     │
     │ useMemo   → resolved → totals│
     └─────────────────────────────┘
```

### جزئیات کلیدی

**فیلتر و جست‌وجو** در `web/src/components/CatalogSection.jsx`
(تابع `visible` در `useMemo`) — تحلیل خط‌به‌خط در فصل ۵.

**افزودن به سبد** در `web/src/context/ShopContext.jsx`. خودِ *شکلِ* ردیف
دیگر اینجا ساخته نمی‌شود — از `lib/cartLine.js` می‌آید:

```js
const addWeighed = useCallback((slug, grams, opts = {}) => {
  const item = bySlug.get(slug);
  if (!item) return;

  const line = buildLine(item, grams, opts, grind);

  setCart((prev) => {
    const i = prev.findIndex((l) => l.key === line.key);
    if (i === -1) return [...prev, line];
    const next = [...prev];
    next[i] = { ...next[i], grams: next[i].grams + grams };
    return next;
  });

  toast(`${formatWeight(grams)} ${item.name} به سبد اضافه شد`);
}, [bySlug, grind, toast]);
```

و `buildLine` همان سه تصمیم قدیمی را دارد، این بار به‌شکل تابع خالص:

```js
export function buildLine(item, grams, opts = {}, fallbackGrind = '') {
  /* آسیاب فقط برای قهوه معنی دارد؛ پودر آسیاب نمی‌خورد */
  const grind = item.grindable ? (opts.grind ?? fallbackGrind) : '';
  const mix = normalizeMix(item, opts.mix);

  return { key: lineKey(item.slug, grind, mix), slug: item.slug, kind: item.kind,
           grams, qty: 0, grind, mix };
}
```

سه تصمیم:
- `opts.grind ?? fallbackGrind` — اگر کارت آسیاب خودش را داد استفاده کن،
  وگرنه پیش‌فرض سایت. (`??` نه `||`، چون رشتهٔ خالی باید معتبر باشد.)
- `normalizeMix`: اگر میکس بود ولی ترکیب دلخواه نداد، ترکیب رسمی گذاشته
  می‌شود؛ دانه‌های صفرشده کنار می‌روند.
- کلید تکراری یعنی «همان چیز دقیقاً» → وزن‌ها جمع می‌شوند.

**چرا بیرون کشیده شد؟** چون ساز میکس دو حالت پیدا کرد (اهرم‌های ساده و
حالت تصویری) و هر دو باید دقیقاً همان ردیف را بسازند. حالا «یک میکس، از
هر راهی که ساخته شود، دقیقاً همان ردیف سبد» یک ادعای تست‌پذیر است نه یک
امید. `ShopContext` همچنان تنها جایی است که سبد را عوض می‌کند؛
`cartLine.js` فقط شکل می‌سازد، بدون هیچ حالتی.

**نکتهٔ رندر:** خودِ کارت‌ها روی سرور رندر می‌شوند و متنشان در HTML اول
هست؛ ولی `ItemCard` یک کامپوننت مشتری است، چون وزن انتخابی و دکمهٔ
افزودن حالت و رویداد می‌خواهند. کلیک روی خودِ کارت هم دیگر فقط یک مودال
باز نمی‌کند: یک `<a href>` واقعی به صفحهٔ کالاست (مورد ۲۷) — جریان بعدی.

---

## ۶.۳ جریان سوم — صفحهٔ اختصاصی کالا، و همان کالا به‌شکل مودال

تا پیش از مورد ۲۷، کلیک روی «دربارهٔ این قهوه» فقط یک مودال باز می‌کرد و
آدرس صفحه عوض نمی‌شد. یعنی هیچ کالایی آدرس قابل‌اشتراک نداشت و گوگل هیچ
صفحه‌ای برای ایندکس کردن نمی‌دید. حالا **همان محتوا** دو راه دارد، و
انتخاب بین آن دو کارِ Next است، نه کارِ ما.

### نمودار جریان

```
                 کلیک روی کارت  ·  <Link href="/coffee/yirgacheffe">
                                 │
             ┌───────────────────┴────────────────────┐
             │                                         │
   از داخل سایت (پیمایش نرم)              بازدید سرد / رفرش / لینک کپی‌شده
             │                                         │
             ▼                                         ▼
   app/@modal/(.)coffee/[slug]/            app/coffee/[slug]/page.jsx
             │                                         │
   itemModalRoute.jsx  (سروری)              itemRoute.jsx  (سروری)
     ├ getItem(kind, slug)                    ├ generateMetadata → itemHeadState
     ├ نام دانه‌ها (فقط میکس)                  ├ getItem(kind, slug)   ← cache
     └ برچسب دو آسیاب از محتوا                ├ !item → notFound() → ۴۰۴ واقعی
             │                                 ├ دانه‌های میکس (فقط میکس)
             ▼                                 ├ getContent() → گزینه‌های آسیاب
   ItemModal.jsx  ('use client')               └ ShopProvider fullCatalogue={false}
     └ ItemDetail + router.back()                       │
             │                                          ▼
             ▼                                 SiteHeader · ItemBuyCard
   صفحهٔ زیر دست‌نخورده می‌ماند                  ItemBody · JSON-LD · Footer
```

### چرا مسیر رهگیری‌شده، و چه چیزی را جایگزین کرد

در نسخهٔ ویت، لینک کارت‌ها موقعیت فعلی را با
`state={{ backgroundLocation }}` همراه خودشان می‌فرستادند و `App.jsx` با
دیدن آن، جدول مسیرها را **دو بار** رندر می‌کرد: یک بار برای صفحهٔ زیر و
یک بار برای مودال.

App Router خودش این را دارد. `app/@modal` یک **مسیر موازی** است و
`(.)coffee/[slug]` یک **مسیر رهگیری‌شده**: پیمایش نرم به آن شکاف می‌رسد،
بازدید سرد به مسیر کامل. همان دو رفتار، بی هیچ حالتِ دستی.

سه فایل کوچک این را کامل می‌کنند:

| فایل | کارش |
|---|---|
| `app/layout.jsx` | شکاف `modal` را کنار `children` رندر می‌کند |
| `app/@modal/default.jsx` | برای آدرسی که هیچ مودالی ندارد `null` می‌دهد — **بدون آن، بازدید سرد ۴۰۴ می‌شود** |
| `_item/ItemModal.jsx` | بستن مودال = `router.back()`، پس دکمهٔ بستن و دکمهٔ back مرورگر یک کار می‌کنند |

### `<head>` مودال — و چرا اصلاً ساخته نمی‌شود

`itemModalRoute.jsx` هیچ `generateMetadata` ندارد، و این عمدی است.

در نسخهٔ ویت مجبور بودیم عنوان صفحه را موقع باز شدن مودال عوض کنیم و با
بستنش برگردانیم — که همان چیزی بود که آن مدیرِ `head` با پشتهٔ سه‌حالته را
لازم می‌کرد. حالا مودال روی صفحه‌ای باز می‌شود که خودش عنوان و canonical
دارد، و **آدرس واقعاً عوض شده**: اگر کاربر لینک را کپی کند یا رباتی سراغ
همان آدرس برود، مسیرِ کامل همان تگ‌ها را می‌دهد. پس چیزی برای عوض کردن
نمانده.

اگر کالا پیدا نشد، مودال چیزی رندر نمی‌کند: صفحهٔ زیر دست‌نخورده می‌ماند
و آدرسِ کامل خودش ۴۰۴ می‌دهد.

### دادهٔ مودال به‌شکل نگاشت می‌آید، نه از کانتکست

```jsx
<ItemDetail
  item={item}
  onClose={close}
  beanName={(slug) => beanNames[slug] || slug}
  grindLabel={(value) => grindLabels[value] || ''}
/>
```

مودال در شکافِ layout ریشه رندر می‌شود، یعنی **بیرون** از `ShopProvider`ی
که `app/page.jsx` می‌سازد؛ پس نمی‌تواند `bySlug` و `grindLabel` را از
کانتکست بگیرد. می‌شد یک Provider دوم اینجا هم گذاشت، ولی آن‌وقت **دو سبد
جدا** می‌داشتیم و افزودن از یکی روی دیگری اثر نمی‌کرد — دامی که بعداً
پیدا کردنش سخت است. پس فقط همان دو چیزی که لازم است، به‌شکل دادهٔ ساده از
سرور می‌آید.

به همین دلیل `itemModalRoute` فقط برچسب **دو** آسیاب را می‌خواند
(`espresso` و `french`)، نه هر هفت‌تا: متنِ `ItemBody` فقط به همان دو
اشاره می‌کند («از اسپرسو تا فرنچ‌پرس»).

### صفحهٔ کامل: چه چیزی سروری است و چه چیزی نه

`itemRoute.jsx` تقریباً تماماً سروری است. تنها تکهٔ مشتری، **ستون خرید**
است (`ItemBuyCard.jsx`) — چون وزن انتخابی حالت است. متنِ کالا
(`ItemBody`) سروری است و از داخل همان درخت پاس داده می‌شود، پس هیچ
جاوااسکریپتی برایش فرستاده نمی‌شود.

و یک تگ که از راه Metadata API نمی‌رود:

```jsx
const ogType = ogTypeFallback(itemHeadState(item, { baseUrl: siteBaseUrl() }));
...
{ogType ? <meta property="og:type" content={ogType} /> : null}
```

`og:type: product` در فهرست بستهٔ Next نیست و اگر به `generateMetadata`
داده شود، رندر متادیتا **خطا می‌دهد** — یعنی کل `<head>` از دست می‌رود،
نه فقط یک تگ. پس همان یک تگ را خودِ صفحه رندر می‌کند و ری‌اکت ۱۹ به
`<head>` می‌بردش. شرح کاملش در ۵ (`lib/metadata.js`) و ۹ (تصمیم ۲۴).

### دو تلهٔ سبد در همین جریان

**تلهٔ اول: فهرست ناقص.** صفحهٔ کالا فقط خودِ کالا (و دانه‌های میکس) را به
`ShopProvider` می‌دهد، نه صد و شش کالا — خواندن کل فهرست برای نشان دادن
یکی بی‌معنی است. ولی سبد مالِ کل سایت است: مشتری می‌تواند دو قهوه در سبد
داشته باشد و بعد صفحهٔ یک ابزار را باز کند. بدون نگهبان، افکتِ پاک‌سازی
همهٔ آن ردیف‌ها را «کالایش در فهرست نیست» می‌دید و پاک می‌کرد.

**تلهٔ دوم: بدنهٔ سفارش.** `CartDrawer` سفارش را از `resolved` می‌سازد —
ردیف‌هایی که با سند کالا جفت شده‌اند. روی فهرست ناقص، ثبت سفارش از صفحهٔ
یک کالا **بی‌صدا** بقیهٔ ردیف‌ها را می‌انداخت.

جوابش پرچم `fullCatalogue={false}` و افکتِ «کامل کردن فهرست» است:
به‌محض اینکه سبد به کالایی بی‌رد اشاره کند، فهرست کامل می‌شود. برای
بازدیدکنندهٔ بی‌سبد — یعنی بیشترشان — این افکت هیچ کاری نمی‌کند و صفحهٔ
کالا سبک می‌ماند. کد و نگهبان‌هایش در ۷.۱۲.

### کالای خاموش

`GET /api/items/:kind/:slug` فقط کالای `active` می‌دهد. پس شناسهٔ ناموجود
و کالایی که مدیر خاموشش کرده **از بیرون یکی دیده می‌شوند**: هر دو
`notFound()` می‌گیرند، هر دو ۴۰۴ واقعی با `noindex`، و هیچ‌کدام در
`sitemap.xml` نمی‌آیند.

عمداً ۴۱۰ نیست: خاموش کردن یعنی «فعلاً فروخته نمی‌شود»، نه «برای همیشه
رفت». برای دومی یک فیلد صریح لازم است.

---

## ۶.۴ جریان چهارم — ساختن میکس دلخواه

این متمایزترین جریان پروژه است.

### نمودار

```
BlendsSection
      │ houseBlends = coffee.filter(isBlend && house).sort(rank)
      ▼
  BlendCard(item)
      │
      ├─ useState(() => startingMix(item))
      │     → [{slug:'cerrado', percent:70}, {slug:'monsooned', percent:30}]
      │
      ├─ perKg = blendPrice(item, mix)
      │     → Σ(bean.price × pct) / Σ(pct) + surcharge  → گرد به ۱۰۰۰
      │
      ├─ error = mixError(mix)
      │     → «حداقل دو دانه» یا «مجموع باید ۱۰۰ باشد»
      │
      ├─ available = همهٔ قهوه‌های غیرمیکسِ خارج از ترکیب
      │
      ▼
 ┌────────────────────────────────────────────────┐
 │  کنش کاربر            تابع                     │
 │────────────────────────────────────────────────│
 │  کشیدن اهرم    →   applyPercent(mix, slug, v)  │
 │  حذف دانه (×)  →   removeBean(mix, slug)       │
 │  افزودن دانه   →   addBean(mix, slug, 20)      │
 │  بازگشت        →   startingMix(item)           │
 └────────────────┬───────────────────────────────┘
                  │  هر کنش: setMix(...) → رندر دوباره
                  │  → perKg تازه → priceFor(perKg, grams) روی کارت
                  ▼
       دکمهٔ «افزودن»  (disabled اگر error)
                  │
                  ▼
       addWeighed(item.slug, grams, { grind: pick, mix })
                  │
                  ▼
       key = 'espresso-70-30|espresso|cerrado:60,monsooned:40'
```

### نکتهٔ کلیدی: هر نسبت، یک ردیف جدا

چون `mixSignature` در کلید ردیف است، مشتری می‌تواند **یک میکس را دو بار
با دو نسبت متفاوت** سفارش دهد و هر کدام ردیف مستقل خودش را دارد. مثلاً:

```
espresso-70-30 | espresso | cerrado:70,monsooned:30   ← ۵۰۰ گرم
espresso-70-30 | french   | cerrado:50,monsooned:50   ← ۲۵۰ گرم
```

### همگام‌سازی با سرور

مهم است بدانید که همان دو قاعده‌ای که `mixError` سمت کلاینت بررسی می‌کند،
سمت سرور هم دوباره بررسی می‌شوند:

| قاعده | کلاینت (`blend.js`) | سرور (`orders.js`) |
|---|---|---|
| حداقل دو دانه | `if (live.length < 2)` | `if (mix.length < 2)` |
| مجموع ۱۰۰ (±۱) | `Math.abs(sum - 100) > 1` | `Math.abs(sum - 100) > 1` |
| فقط قهوه | (فهرست `available` فیلتر شده) | `if (bean.kind !== 'coffee')` |
| میکس در میکس نه | (فیلتر `!b.isBlend`) | `if (bean.isBlend)` |

کلاینت برای **تجربهٔ کاربری** بررسی می‌کند، سرور برای **درستی**.

---

## ۶.۵ جریان پنجم — تسویه و ثبت سفارش

این مهم‌ترین جریان از نظر امنیت است.

### نمودار توالی کامل

```
CartDrawer          api.js         Express/orders.js        pricing.js       MongoDB
    │                  │                   │                    │              │
    │ step='cart'      │                   │                    │              │
    │ کاربر: «ثبت سفارش»                   │                    │              │
    │ step='form'      │                   │                    │              │
    │                  │                   │                    │              │
    │ submit():        │                   │                    │              │
    │ ├ toLatinDigits(phone)                │                    │              │
    │ ├ نام خالی؟                           │                    │              │
    │ ├ /^0\d{10}$/ ؟                       │                    │              │
    │ └ نشانی ≥ ۱۰ نویسه؟                   │                    │              │
    │                  │                   │                    │              │
    │─ placeOrder({lines, customer}) ──────►│                    │              │
    │   ⚠ هیچ قیمتی فرستاده نمی‌شود          │                    │              │
    │                  │                   │                    │              │
    │                  │      ۱) lines خالی/بیش از ۱۰۰؟ → ۴۰۰   │              │
    │                  │      ۲) wanted = slugها + mix slugها    │              │
    │                  │      ۳) Item.find({slug:$in, active}) ─────────────────►│
    │                  │◄─────────────────────────────────────────────────────  │
    │                  │      ۴) grindMap() از Content ─────────────────────────►│
    │                  │      ۵) برای هر ردیف:                   │              │
    │                  │         ├ کالا موجود؟                   │              │
    │                  │         ├ آسیاب معتبر؟                  │              │
    │                  │         ├ میکس: قهوه؟ غیرمیکس؟ تکراری؟ Σ=۱۰۰؟         │
    │                  │         └ وزن/تعداد در بازه؟            │              │
    │                  │      ۶) computeTotals(lines, lookup) ──►│              │
    │                  │◄─────────────────────────── totals ─────│              │
    │                  │      ۷) reserveStock(lines, Item) ─────────────────────►│
    │                  │         findOneAndUpdate اتمی، ردیف‌به‌ردیف               │
    │                  │         کم آمد؟ → پس دادن رزروها → ۴۰۹                  │
    │                  │      ۸) Order.create({...}) ───────────────────────────►│
    │                  │              pre('validate') → code                     │
    │                  │              خطا؟ → releaseStock(taken)                 │
    │                  │◄────────────────────────────────── order ──────────────│
    │◄─ ۲۰۱ {code, createdAt, lines, customer, totals} ─────────│              │
    │                  │                   │                    │              │
    │ setDone(res)     │                   │                    │              │
    │ clearCart()      │                   │                    │              │
    │ <Receipt order={done} shop={content.about} />              │              │
```

### گام ۱ — اعتبارسنجی سمت کلاینت

`web/src/components/CartDrawer.jsx`:

```js
const phone = toLatinDigits(form.phone).trim();

if (!form.name.trim()) return setError('نام گیرنده را بنویسید');
if (!/^0\d{10}$/.test(phone)) {
  return setError('شمارهٔ موبایل را کامل و با ۰ اول وارد کنید، مثل ۰۹۱۲۱۲۳۴۵۶۷');
}
if (form.address.trim().length < 10) return setError('نشانی را کامل‌تر بنویسید');
```

`toLatinDigits` قبل از regex اجرا می‌شود، چون کاربر با کیبورد فارسی
`۰۹۱۲۱۲۳۴۵۶۷` می‌نویسد.

### گام ۲ — ساخت بار درخواست

```js
lines: resolved.map((l) =>
  l.kind === 'gear'
    ? { slug: l.slug, qty: l.qty }
    : {
        slug: l.slug,
        grams: l.grams,
        ...(l.item.grindable ? { grind: l.grind || 'whole' } : {}),
        ...(l.item.isBlend && l.mix?.length ? { mix: l.mix } : {})
      }
),
```

فقط چهار چیز: شناسه، مقدار، آسیاب، ترکیب. **نه قیمت، نه جمع، نه تخفیف.**
عملگر spread شرطی (`...(cond ? {k:v} : {})`) فیلدهای بی‌ربط را حذف می‌کند.

### گام ۳ — بازسازی داده در سرور

`server/src/routes/orders.js`:

```js
const wanted = new Set(raw.map((l) => String(l.slug || '')));
/* اجزای میکس هم لازم‌اند تا قیمت را دوباره حساب کنیم */
for (const l of raw) {
  if (Array.isArray(l.mix)) for (const m of l.mix) wanted.add(String(m.slug || ''));
}

const items = await Item.find({ slug: { $in: [...wanted] }, active: true });
const bySlug = new Map(items.map((i) => [i.slug, i]));
const lookup = (slug) => bySlug.get(slug);
```

**یک کوئری برای همه‌چیز.** اگر سبد ۱۰ ردیف با ۳ میکس داشته باشد، همچنان
یک `find` است، نه ۱۰ تا. و شرط `active: true` یعنی کالای پنهان‌شده قابل
سفارش نیست.

### گام ۴ — اعتبارسنجی هر ردیف

```js
const item = bySlug.get(String(l.slug || ''));
if (!item) {
  return res.status(400).json({ error: `کالای «${l.slug}» دیگر موجود نیست. سبد را به‌روز کنید.` });
}

let grind = '';
if (item.grindable) {
  grind = String(l.grind || 'whole');
  if (!grinds.has(grind)) {
    return res.status(400).json({ error: `نحوهٔ تحویل «${item.name}» نامعتبر است` });
  }
}
```

توجه: `item.grindable` از **پایگاه داده** خوانده می‌شود، نه از ورودی.
اگر مشتری برای یک ماگ `grind: 'espresso'` بفرستد، بی‌سروصدا نادیده
گرفته می‌شود چون `grindable` آن `false` است.

**بررسی میکس** دو شاخه دارد:

```js
if (!item.customizable) {
  /* مشتری اجازهٔ تغییر ندارد — ترکیب رسمی خودمان را می‌گذاریم */
  mix = item.components.map((c) => ({ slug: c.slug, percent: c.percent }));
} else {
  /* بررسی کامل ترکیب ارسالی */
}
```

اگر مدیر `customizable` را خاموش کرده باشد، هر چه مشتری بفرستد **دور
ریخته می‌شود** و ترکیب رسمی جایگزین می‌شود. این یک الگوی امنیتی خوب است:
به‌جای خطا دادن، حالت امن را اعمال کن.

در شاخهٔ `customizable`:

```js
if (!bean) → 'دانهٔ «x» در میکس موجود نیست'
if (seen.has(slug)) → 'یک دانه دو بار در میکس آمده است'
if (bean.kind !== 'coffee') → '«x» قهوه نیست و در میکس نمی‌آید'
if (bean.isBlend) → '«x» خودش یک میکس است و جزء میکس دیگری نمی‌شود'
if (!Number.isFinite(percent) || percent < 0 || percent > 100) → 'درصدهای میکس نامعتبرند'
if (percent === 0) continue;              // دانهٔ برداشته‌شده
if (mix.length < 2) → 'میکس باید دست‌کم دو دانه داشته باشد'
if (Math.abs(sum - 100) > 1) → `مجموع درصدهای میکس باید ۱۰۰ باشد، الان ${sum} است`
```

**بررسی مقدار:**

```js
if (item.kind === 'gear') {
  const qty = Math.floor(Number(l.qty));
  if (!Number.isFinite(qty) || qty < 1 || qty > 999) {
    return res.status(400).json({ error: `تعداد «${item.name}» نامعتبر است` });
  }
  lines.push({ kind: 'gear', item, qty, grams: 0, grind: '', mix: [] });
} else {
  const grams = Math.round(Number(l.grams));
  const min = MIN_GRAMS[item.kind] || 50;
  if (!Number.isFinite(grams) || grams < min || grams > 100000) {
    return res.status(400).json({ error: `وزن «${item.name}» نامعتبر است` });
  }
  lines.push({ kind: item.kind, item, grams, qty: 0, grind, mix });
}
```

`Number.isFinite` هم `NaN` را می‌گیرد و هم `Infinity` را — بررسی
کامل‌تری از `!isNaN`.

### گام ۵ — بازمحاسبهٔ قیمت

```js
const totals = computeTotals(lines, lookup);
```

**همان تابعی که مرورگر استفاده کرده**، اما با `item`هایی که مستقیم از
پایگاه داده آمده‌اند. اگر مشتری قیمت را دستکاری کرده بود، اثری ندارد
چون قیمت اصلاً از ورودی خوانده نمی‌شود.

### گام ۶ — رزرو موجودی (مورد ۳۴)

آخرین کاری است که پیش از ثبت انجام می‌شود، و ترتیبش عمدی است: تا اینجا
**هر خطای اعتبارسنجی بدون لمس انبار برگشته است**، پس چیزی برای پس دادن
نمی‌ماند.

```js
const { error: stockError, taken } = await reserveStock(lines, Item);
if (stockError) return res.status(409).json({ error: stockError });
```

درون `server/src/lib/stock.js`، هر ردیف با یک عملیات اتمی رزرو می‌شود:

```js
const updated = await ItemModel.findOneAndUpdate(
  { slug: item.slug, stock: { $gte: need } },   // شرط
  { $inc: { stock: -need } },                   // کاهش
  { new: true, projection: { stock: 1 } }
);
```

شرط و کاهش زیر یک قفل سند اجرا می‌شوند، پس دو مشتری که هم‌زمان آخرین
۵۰۰ گرم را می‌خواهند دقیقاً یکی‌شان برنده می‌شود و دیگری `null` می‌گیرد.
هیچ transaction ای لازم نیست — که روی مونگوی تک‌گرهی اصلاً در دسترس
نیست.

سه جزئیات که این گام را درست نگه می‌دارند:

**۱) کالای نامحدود اصلاً لمس نمی‌شود.** `isTracked(item)` فقط عدد متناهی
را «شمرده‌شده» می‌داند؛ `$inc` روی `null` خطا می‌دهد و شرط `$gte` هم با
`null` جور نمی‌شود.

**۲) همه یا هیچ.** ردیف سوم می‌تواند بعد از موفقیت دو ردیف اول شکست
بخورد. `taken` هر رزرو موفق را نگه می‌دارد و در شکست همه با هم
برمی‌گردند. و اگر خودِ `Order.create` هم خطا بدهد، روتر همان
`releaseStock(taken, Item)` را صدا می‌زند:

```js
} catch (err) {
  /* ثبت سفارش شکست خورد — انبار نباید بی‌دلیل کم بماند */
  await releaseStock(taken, Item);
  throw err;
}
```

**۳) پیام از موجودیِ همان لحظه ساخته می‌شود**، نه از عددی که در حافظه
داشتیم — که ممکن است مالِ چند لحظه پیش باشد:
«موجودی «یرگاچف» کافی نیست — فقط ۳۰۰ گرم مانده است».

**چرا ۴۰۹ و نه ۴۰۰؟** چون ورودی مشتری غلط نبود؛ دنیا عوض شده بود. با
۴۰۹، رابط کاربری سبد را دست‌نخورده نگه می‌دارد و فقط پیام موجودی را
نشان می‌دهد.

### گام ۷ — درج

```js
const order = await Order.create({
  lines: lines.map((l) => ({
    kind: l.kind,
    slug: l.item.slug,
    name: l.item.name,
    unitPrice: unitPriceFor(l, lookup),
    grams: l.grams,
    qty: l.qty,
    lineTotal: lineTotal(l, lookup),
    grind: l.grind,
    grindLabel: l.grind ? grinds.get(l.grind) || '' : '',
    mix: l.mix.map((m) => ({
      slug: m.slug,
      name: bySlug.get(m.slug)?.name || m.slug,
      percent: m.percent
    }))
  })),
  customer: { name: ..., phone: ..., address: ..., note: ... },
  totals
});
```

هر ردیف snapshot کامل می‌شود: نام، قیمت واحد، جمع ردیف، برچسب فارسی
آسیاب، و نام هر دانهٔ میکس.

### گام ۸ — پاسخ

```js
/* رسید را از روی سفارشِ ذخیره‌شده برمی‌گردانیم، نه از
   روی چیزی که مرورگر فرستاده — تا مشتری دقیقاً همان
   چیزی را ببیند که ثبت شده و بعداً آماده می‌شود. */
res.status(201).json({
  ok: true, code: order.code, createdAt: order.createdAt,
  lines: order.lines, customer: order.customer, totals: order.totals
});
```

### گام ۹ — رسید

کامپوننت `Receipt` در `CartDrawer.jsx` رسید را از `done` (پاسخ سرور)
می‌سازد، نه از سبد — پس قیمت‌هایش همان چیزی است که واقعاً ثبت شده. حتی
شمارهٔ تماس فروشگاه از `content.about` خوانده می‌شود، تا اگر مدیر آن را
عوض کرد رسید هم به‌روز باشد.

`Receipt` یک کامپوننت مشترک است و همین صفحه تنها صداکننده‌اش نیست؛ صفحهٔ
پیگیری هم همان را رندر می‌کند. تفاوت‌های آن دو با چهار پارامتر
(`heading`، `showMark`، `statusLabel`، `showTracking`) پوشانده می‌شود
— جدولش در فصل ۵.

### گام ۱۰ — چاپ

این گام هم از کشوی سبد شروع می‌شود و هم از صفحهٔ پیگیری، و در هر دو
مسیر یک چیز است:

```
onClick  ->  window.print()
    |
    +-- <body class="has-print-sheet">      PrintSheet added it on mount
    |
    v
@media print                             web/src/admin.css
    |
    +-- body.has-print-sheet > *:not(.print-sheet) { display: none }
    |        header, catalogues, cards, footer, drawer, toast
    |
    +-- .print-sheet { display: block }   direct child of body, via portal
             |
             v
        <Receipt />   10pt, black on white, break-inside: avoid
```

**چرا رسید دو بار رندر می‌شود.** یکی داخل درخت صفحه (آنچه کاربر روی
نمایشگر می‌بیند) و یکی به‌شکل فرزندِ **مستقیمِ** `body`:

```jsx
<div className="drawer-body">
  <Receipt order={done} shop={content?.about} />
</div>

<PrintSheet>
  <Receipt order={done} shop={content?.about} />
</PrintSheet>
```

بدون نسخهٔ دوم، قاعدهٔ چاپ باید نیاکانِ رسید را پنهان می‌کرد — و هر
نیایی که پنهان شود خودِ رسید را هم می‌برد. با نسخهٔ دوم، قاعده یک خط
می‌شود: «هر فرزند body به‌جز این یکی».

**نسخهٔ پیشین و اینکه چرا عوض شد.** تا پیش از این، سبک چاپ همه‌چیز را با
`visibility: hidden` نامرئی می‌کرد و فقط کشو را برمی‌گرداند.
`visibility` عنصر را از **چیدمان** حذف نمی‌کند: کل فروشگاه همچنان
ارتفاعِ واقعیِ خودش را داشت و مرورگر همان ارتفاع را صفحه‌بندی می‌کرد.
نتیجه اندازه‌گیری شد — **۳۳ صفحه، که ۳۱ تای آخرش کاغذ سفیدِ خالی بود.**
شرح کاملِ سبک در ۸.۱۰ و چراییِ تصمیم در تصمیم ۲۷ فصل ۹.

> **نکته**
> کلاس `has-print-sheet` را `PrintSheet` موقع mount روی `body`
> می‌گذارد و موقع unmount برمی‌دارد. بدون آن، قاعدهٔ «هر فرزند body را
> بردار» روی **هر** صفحه‌ای اجرا می‌شد و `Ctrl+P` روی خودِ فروشگاه یک
> برگ سفید می‌داد.

---

## ۶.۶ جریان ششم — پیگیری سفارش بدون حساب کاربری

مشتری حساب کاربری ندارد؛ بعد از بستن رسید، تا پیش از مورد ۳۵ هیچ راهی
نداشت بفهمد سفارشش کجاست. این جریان با همان دو چیزی کار می‌کند که دستش
هست: **شمارهٔ سفارش** و **شمارهٔ موبایلی که داده**.

### نمودار جریان

```
   /track  یا  /track?code=K7B2-4193   (از لینک رسید)
        │
        ▼
  app/track/page.jsx   ← کامپوننت سروری
        ├ metadata = toNextMetadata({ ..., robots: 'noindex, follow' })
        └ <Suspense> … </Suspense>
                 │
                 ▼
        components/Track.jsx   ('use client')
                 ├ useSearchParams() → پیش‌پر کردن code
                 ├ toLatinDigits(code) و toLatinDigits(phone)
                 ├ هر دو خالی؟ → پیام محلی، بی درخواست
                 ▼
        api.trackOrder({ code, phone })
                 │  GET /api/orders/track?code=&phone=   (عمومی)
                 ▼
        trackLimiter   ۲۰ تلاش در ۱۵ دقیقه
                 ▼
        lib/track.js → findOrderForTracking({ code, phone }, Order)
                 ├ ورودی ناقص → ۴۰۰ با پیام راهنما
                 ├ Order.findOne({ code })
                 ├ safeEqual(normalizePhone(...), wantedPhone)   ← زمان‌ثابت
                 ├ نبود **یا** جور نبود → ۴۰۴ با پیام **یکسان**
                 └ جور بود → publicOrderView(order)
                 ▼
        Track.jsx: StatusBar + ردیف‌ها + جمع‌ها
```

### چه چیزی با مورد ۲۶ عوض شد

خودِ پیگیری نمی‌تواند سروری باشد، و این یک محدودیت واقعی است نه سلیقه:
مشتری باید کد و موبایلش را **بنویسد**، و آن جفت هیچ‌وقت در آدرس
نمی‌نشیند — و نباید بنشیند، وگرنه در تاریخچهٔ مرورگر و لاگ پراکسی
می‌ماند. پس فرم و نتیجه سمت مشتری ماندند.

آنچه سروری شد، `<head>` است:

```js
export const metadata = toNextMetadata({
  title: `پیگیری سفارش — ${SITE_NAME}`,
  description: 'وضعیت سفارشتان را با شمارهٔ سفارش و شمارهٔ موبایل ببینید.',
  /* همان چیزی که robots.txt هم می‌گوید — ولی این یکی
     ایندکس شدن را هم می‌بندد، نه فقط خزیدن را. */
  robots: 'noindex, follow'
});
```

در نسخهٔ ویت این تگ‌ها را یک هوک در **زمان اجرا** می‌نوشت. برای `noindex`
این فرق می‌کند: رباتی که جاوااسکریپت اجرا نمی‌کند هم حالا آن را می‌بیند.

`Suspense` هم از همین‌جا آمد: `Track` از `useSearchParams` استفاده می‌کند
و Next می‌خواهد چنین تکه‌ای مرز Suspense خودش را داشته باشد، تا اگر روزی
این مسیر پیش‌رندر شد، بقیهٔ صفحه گروگانِ پارامترهای آدرس نماند.

`robots.txt` هم `/track` را می‌بندد — آدرس‌های `?code=…` نباید در نتایج
جست‌وجو بنشینند.

### دو محافظ که این جریان را از یک ابزار شمارش جدا می‌کنند

**یک) پیام یکسان.** «کد وجود ندارد» و «شماره جور نیست» **دقیقاً** یک
پاسخ می‌گیرند، از یک ثابت صادرشده:

```js
export const NOT_FOUND_MESSAGE = 'سفارشی با این شماره و شمارهٔ موبایل پیدا نشد';
```

اگر فرق می‌کرد، یک اسکریپت می‌توانست کدها را یکی‌یکی امتحان کند و بدون
دانستن هیچ شماره‌ای بفهمد کدام کدها **وجود دارند** — و از آنجا تعداد
سفارش‌های فروشگاه و نرخ رشدشان.

**دو) زمانِ یکسان.** پیام یکسان کافی نیست: اگر برای کد ناموجود سریع‌تر
پاسخ بدهیم، خودِ زمان همان چیزی را لو می‌دهد که پنهانش کردیم.

```js
const stored = normalizePhone(doc?.customer?.phone);
const matches = safeEqual(stored || ' no-order', wantedPhone);
if (!doc || !matches) return { status: 404, error: NOT_FOUND_MESSAGE };
```

مقایسه هم زمان‌ثابت است و **اول هش می‌شود**، چون `timingSafeEqual`
طول‌های نابرابر را قبول نمی‌کند و پرتاب خطا می‌کند — که خودش یک نشتِ
زمانی است. تحلیل کاملش در ۷.۶ و در پرسش ۳۲ فصل ۱۰.

### آنچه برگردانده می‌شود، و آنچه نمی‌شود

`publicOrderView` سند را **بازسازی** می‌کند، نه اینکه فیلدهای ناخواسته را
حذف کند: `code`، `status`، `createdAt`، فقط **نام** مشتری، ردیف‌ها و
جمع‌ها. نشانی، شمارهٔ تماس و یادداشتِ مشتری بیرون می‌مانند.

اثباتِ مالکیت اینجا یک جفت کوتاه است و از یک رمز عبور خیلی ضعیف‌تر. پس
فرض را بر این می‌گذاریم که روزی یک حدس موفق می‌شود و می‌پرسیم: آن‌وقت چه
چیزی لو رفته؟ با طراحی فعلی، نه نشانی خانهٔ کسی.

### وضعیت، به زبان مشتری

```js
const STEPS = ['new', 'processing', 'done'];
```

سه گام معمول، با کلیدهایی که همان `enum` مدل `Order` اند. «لغو شده» گام
نیست، پس جدا و با یک پیام نشان داده می‌شود — نه به‌عنوان مرحلهٔ چهارم.

### و یک نسخهٔ کاغذی، از همان‌جا

این جریان یک پایانِ دوم هم دارد. مشتری‌ای که رسیدش را بسته، تا پیش از
این هیچ راهی برای گرفتن یک نسخهٔ چاپی نداشت؛ حالا دکمهٔ «چاپ یا ذخیرهٔ
رسید» همان برگه‌ای را می‌دهد که کشوی سبد می‌داد — **همان کامپوننت
`Receipt` و همان سبکِ چاپ**، پس دو رسیدِ متفاوت به وجود نمی‌آید.

چهار پارامتر تفاوت‌ها را می‌پوشانند: عنوان «رسید سفارش» می‌شود، تیکِ
سبزِ «ثبت شد» برداشته می‌شود (این سفارش ممکن است لغو شده باشد)، وضعیت
اضافه می‌شود، و لینکِ «وضعیت سفارش را ببینید» می‌رود — مشتری همین حالا
رویش ایستاده.

آنچه روی نمایشگر است دست نمی‌خورد: نوار مرحله و بلوکِ وضعیت مالِ
صفحه‌اند و در `PrintSheet` نیستند. گردشِ کاملِ چاپ در گام ۱۰ همین فصل و
سبکش در ۸.۱۰.

> **نکته**
> بلوکِ تماسِ برگهٔ چاپی به متن‌های سایت نیاز دارد، پس این صفحه کنارِ
> `trackOrder` یک `api.content()` هم می‌زند — با `.catch(() => null)`.
> نیامدنش نباید پیگیری را زمین بزند؛ فقط تلفن و نشانی از پای رسید
> می‌افتند.

---

## ۶.۷ جریان هفتم — ورود مدیر

```
AdminLogin        AuthContext        api.js         auth.js         Admin model
    │                 │                 │              │                 │
    │ submit()        │                 │              │                 │
    │─ login(u, p) ──►│                 │              │                 │
    │                 │─ api.login ────►│─ POST /login►│                 │
    │                 │                 │              │─ findOne().select('+passwordHash')
    │                 │                 │              │◄────────────────│
    │                 │                 │              │─ bcrypt.compare►│
    │                 │                 │              │◄─ true/false ───│
    │                 │                 │              │
    │                 │                 │              │  اگر غلط: ۴۰۱ «نام کاربری یا رمز عبور درست نیست»
    │                 │                 │              │  (پیام یکسان برای هر دو حالت)
    │                 │                 │              │
    │                 │                 │              │─ signToken(admin)
    │                 │                 │◄─ {token, admin} ──────────────│
    │                 │◄────────────────│              │
    │                 │ setToken(token) → localStorage │
    │                 │ setAdmin(a)     │              │
    │◄─ router.replace('/admin/items') ────────────────│
```

**کجای درخت چه چیزی است.** این جریان با مورد ۲۶ سه‌تکه شد و تقسیمش عیناً
همان چیزی است که در نسخهٔ ویت بود، فقط با پوشه به‌جای `<Route>`:

| فایل | نقش |
|---|---|
| `app/admin/layout.jsx` | `AuthProvider` + `metadata` با `robots: noindex` — **بیرون از دروازه**، چون صفحهٔ ورود هم لازمش دارد تا بفهمد از قبل وارد شده‌اید یا نه |
| `app/admin/login/page.jsx` | یک خط: `AdminLogin` را دوباره صادر می‌کند |
| `app/admin/(panel)/layout.jsx` | یک خط: `AdminShell` — همین **دروازه** است |

گروه مسیر `(panel)` در آدرس دیده نمی‌شود؛ فقط برای همین تقسیم است.

سپس `AdminShell` محافظت می‌کند — و اینجا یک تفاوت واقعی با react-router
هست: App Router کامپوننتی مثل `<Navigate>` ندارد و هدایت نباید در رندر
انجام شود.

```jsx
useEffect(() => {
  if (!checking && !admin) router.replace('/admin/login');
}, [checking, admin, router]);

if (checking || !admin) return <div className="admin-boot">در حال بررسی نشست…</div>;
```

شرط `if` دوم فقط برای زیبایی نیست: بین اجرای افکت و رسیدن به صفحهٔ ورود
یک لحظه فاصله هست، و بدون آن پنل یک لحظه برق می‌زد و بعد می‌رفت. همین
الگو در `AdminLogin` هم هست، این بار برای حالت معکوس: اگر از قبل وارد
شده‌اید، به‌جای فرمِ بی‌فایده همان پیام «بررسی نشست» دیده می‌شود تا
هدایت انجام شود.

`app/admin/page.jsx` هم همان کاری را می‌کند که
`<Route index element={<Navigate to="/admin/items" />} />` می‌کرد، ولی
روی سرور:

```js
export default function AdminIndex() {
  redirect('/admin/items');
}
```

و از این به بعد، هر درخواست مدیریتی هدر `Authorization` می‌گیرد:

```js
if (auth) headers.Authorization = `Bearer ${getToken()}`;
```

**خروج خودکار در صورت انقضا:**

```js
if (!res.ok) {
  if (res.status === 401 && auth) {
    clearToken();
    onUnauthorized();   // ← AuthContext.setAdmin(null)
  }
  throw new Error(data?.error || `خطای سرور (${res.status})`);
}
```

`setAdmin(null)` باعث rerender `AdminShell` می‌شود، همان افکتِ دروازه
دوباره اجرا می‌شود و `router.replace` کاربر را به صفحهٔ ورود می‌برد —
بدون اینکه هیچ کامپوننتی صریحاً چنین دستوری داده باشد.

> **نکته**
> این کل زنجیره فقط زیر `/admin` زندگی می‌کند. `AuthProvider` در
> `app/admin/layout.jsx` است، نه در ریشه؛ پس بازدیدکنندهٔ فروشگاه نه
> `api.me()` می‌فرستد و نه کد پنل را دانلود می‌کند — تقسیم باندل بر
> اساس مسیر را Next خودش انجام می‌دهد (نیمهٔ حل‌شدهٔ مورد ۲۰).

---

## ۶.۸ جریان هشتم — ویرایش کالا با پیش‌نمایش زنده

```
/admin/items → کلیک «ویرایش» → /admin/items/:id
                                       │
                            ┌──────────▼──────────┐
                            │  AdminItemForm      │
                            │  useParams() از      │
                            │  next/navigation     │
                            └──────────┬──────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │ ۱) api.adminItem(id)         │ ۲) api.adminItems({kind:'coffee'})
        │    → GET /items/admin/:id    │    → فهرست دانه‌ها برای میکس
        ▼                              ▼
   setForm({ ...BLANK, ...item,   setBeans(list.filter(b => !b.isBlend))
     notes: item.notes.join('\n'),
     pairs: item.pairs.join('\n'),
     components: [...] })
        │
        ├──────────────► preview = useMemo(...)  ──► <ItemCard item={preview}/>
        │                (شیء موقتی با همان شکل کالا)      ↑ همان کارت واقعی سایت
        │
   کاربر ویرایش می‌کند → هر تغییر → preview دوباره → کارت زنده به‌روز
        │
        ▼
   save(e):
     ├ نام خالی؟ → خطا
     ├ slug خالی؟ → خطا
     ├ قیمت ≤ ۰؟ → خطا
     ├ اگر میکس: کمتر از ۲ دانه؟ Σ ≠ ۱۰۰؟ → خطا
     │
     └─ api.updateItem(id, payload) → PUT /api/items/:id
                                            │
                                    ┌───────▼────────┐
                                    │ requireAdmin   │
                                    │ findById       │
                                    │ pickBody       │  ← whitelist
                                    │ checkBlend     │  ← یکپارچگی
                                    │ removeImageFile│  ← اگر عکس عوض شده
                                    │ Object.assign  │
                                    │ save()         │  ← pre('validate')
                                    └───────┬────────┘
                                            │
                  useStorefrontRefresh() ◄────┘   router.push('/admin/items')
```

**نکتهٔ معماری:** پیش‌نمایش از **همان کامپوننت `ItemCard`** استفاده
می‌کند که در سایت واقعی رندر می‌شود. یعنی هیچ‌وقت پیش‌نمایش و واقعیت
واگرا نمی‌شوند. کامنت `preview` این را می‌گوید: «تا پیش‌نمایش دقیقاً مثل
سایت رفتار کند.»

**دو لایهٔ اعتبارسنجی:** بررسی زودهنگام در `save()` با کامنت «بررسی
زودهنگام تا مدیر برای خطای ساده منتظر سرور نماند»، و بررسی قطعی در
`pre('validate')` مدل.

**«فروشگاه را تازه کن» چه چیزی را تازه می‌کند.** در نسخهٔ ویت این
`useShop().reload()` بود، چون `ShopContext` فهرست کالاها را یک بار موقع
بالا آمدن سایت می‌گرفت و در حافظه نگه می‌داشت. در Next آن حافظه وجود
ندارد — هر صفحهٔ فروشگاه در هر درخواست از نو ساخته می‌شود — ولی **کشِ
مسیریابِ سمت مشتری** هست: اگر مدیر پیش از رفتن به پنل صفحهٔ اصلی را دیده
باشد، بازگشتش می‌تواند از همان نسخهٔ کش‌شده بیاید.

`useStorefrontRefresh()` دقیقاً همین را باطل می‌کند (`router.refresh()`).
شکلِ صدا زدن در سه فایل پنل دست‌نخورده ماند؛ فقط موتورش عوض شد.

**و چرا پنل هنوز `ShopProvider` دارد.** پیش‌نمایش زنده به `ItemCard`
واقعی نیاز دارد و آن کارت برای میکس‌ها قیمت را از میانگین وزنیِ دانه‌ها
حساب می‌کند — یعنی به فهرست کالاها. صفحه‌های پنل سروری نیستند که کسی
فهرست را برایشان آماده کند، پس `AdminShell` با پرچم `loadOnMount` آن را
در مرورگر می‌گیرد. این تنها جای پروژه است که `ShopProvider` هنوز خودش
داده می‌خواند.

---

## ۶.۹ جریان نهم — گزارش فروش و پشتیبان

```
AdminReports
     │
     ├─ api.reportSummary(period, count)
     │       → GET /api/reports/summary?period=month&count=12
     │            │
     │            ├ bucketSeries('month', 12)  ← lib/jalali.js
     │            │    [مرداد ۱۴۰۴ … مرداد ۱۴۰۵]  (شامل ماه‌های خالی)
     │            │
     │            ├ Order.find({createdAt: {$gte: windowStart}},
     │            │            {createdAt:1, status:1, totals:1})   ← projection سبک
     │            │
     │            ├ برای هر سفارش: bucketOf(date,'month') → addOrder(bucket, o)
     │            │    (لغوشده فقط canceled++ می‌شود، در فروش نمی‌آید)
     │            │
     │            ├ windowTotals = جمع سطل‌ها
     │            ├ allTime = aggregate با $cond
     │            └ firstOrderAt
     │
     ├─ کلیک روی ردیف بازه → setRange({from, to, label})
     │
     ├─ api.reportOrders({from, to, status, q, page, limit})
     │       → GET /api/reports/orders?…
     │            │
     │            ├ buildFilter(query)   ← بازه + وضعیت + جست‌وجو
     │            ├ Promise.all([find().skip().limit(), countDocuments()])
     │            └ aggregate topItems (۱۰ کالای پرفروش همان بازه)
     │
     ├─ کلیک روی سفارش → openOrder()
     │       setOpen(order)         ← فوری از فهرست
     │       api.order(id) → setOpen(fresh)   ← نسخهٔ قطعی
     │
     └─ دکمه‌های خروجی → grab(kind)
             ├ 'orders' → reportCsv({...params, mode:'orders'})
             ├ 'lines'  → reportCsv({...params, mode:'lines'})
             └ 'json'   → reportJson(params)
                    │
                    └─ download(url) در api.js
                         ├ fetch با هدر Authorization
                         ├ خواندن نام از Content-Disposition
                         ├ blob → URL.createObjectURL
                         ├ <a download> موقت → click() → remove()
                         └ URL.revokeObjectURL
```

**نکتهٔ مهم UX:** خروجی‌ها همان فیلترهای صفحه را می‌گیرند. متن جعبهٔ
پشتیبان این را صریح می‌گوید:

> فایل‌ها دقیقاً همان سفارش‌هایی را می‌گیرند که الان انتخاب کرده‌اید
> (مرداد ۱۴۰۵). برای پشتیبانِ واقعی، فایل JSON را نگه دارید: همه‌چیز
> بی‌کم‌وکاست در آن هست.

و این با کد جور است — همان `params` هم به `reportOrders` و هم به
`reportCsv`/`reportJson` داده می‌شود.

**تفاوت CSV و JSON:**

| | CSV | JSON |
|---|---|---|
| هدف | تحلیل در اکسل | پشتیبان کامل |
| محتوا | ستون‌های منتخب و قالب‌بندی‌شده | عیناً سند MongoDB |
| تاریخ | شمسی + ISO | فقط ISO |
| محافظ فرمول | دارد (`csvCell`) | ندارد (لازم نیست) |
| BOM | دارد | ندارد |

---

## ۶.۱۰ جریان جانبی — عضویت در باشگاه

```
ClubSection (فرم)
     │ اعتبارسنجی: نام ≥۲، /^0\d{10}$/، ایمیل اگر پر بود
     ▼
 api.joinClub({name, phone, email, taste})
     │
     ▼  POST /api/club  (عمومی)
 toLatin(phone) → حذف فاصله و خط تیره، رقم فارسی/عربی → لاتین
     │
     ├─ ClubMember.findOne({phone})
     │      ├ موجود → به‌روزرسانی + { ok:true, already:true }
     │      └ نبود  → create + ۲۰۱ { ok:true, already:false }
     ▼
 ClubSection نمایش:
     done.already ? 'اطلاعات‌تان به‌روز شد' : c.successTitle
```

الگوی **upsert کاربرپسند**: عضو تکراری خطا نمی‌گیرد، بلکه پیام مناسب
می‌بیند. این تصمیم در کامنت روتر آمده: «اگر قبلاً عضو شده، اطلاعاتش را
تازه می‌کنیم و همان پیام خوشامد را می‌دهیم — نه پیام خطا.»

---

## ۶.۱۱ جریان جانبی — هم‌رسانی یک کالا

کوتاه‌ترین جریان سایت — یک کلیک و یک پاسخ — ولی سه جای متفاوت شروعش
می‌کنند و چهار پایان متفاوت دارد.

```
ShareButton.onShare(e)            ItemCard | ItemBuyCard | ItemDetail
    |
    +-- e.preventDefault() + e.stopPropagation()
    +-- setBusy(true)
    v
shareItem(item)                          web/src/lib/share.js
    |
    +-- url = itemHeadState(item, {baseUrl}).canonical
    |
    +-- navigator.share && isTouchDevice()
    |         |
    |         +-- nav.share({title, url})  ---->  mode = 'shared'
    |         +-- err.name === 'AbortError' ---->  mode = 'canceled'
    |         +-- any other error ------------+
    |                                         |
    +-----------------------------------------+
    v
copyText(url)
    +-- navigator.clipboard.writeText(url)  ---->  mode = 'copied'
    +-- textarea + document.execCommand()   ---->  mode = 'copied'
    +-- neither                             ---->  mode = 'failed'
    |
    v
ShareButton
    'shared' | 'canceled'  ->  ---
    'copied'               ->  toast(SHARE_COPIED)
    'failed'               ->  toast(SHARE_FAILED)
    |
    v
toastStore.toast(msg)  ->  <Toast /> in app/layout.jsx
```

سه چیز در همین نمودار عمدی‌اند:

- `preventDefault` و `stopPropagation` چون دکمه داخل کارتی می‌نشیند که پر
  از کنترل است؛ این کلیک نباید به هیچ‌چیز دیگری برسد.
- `setBusy(true)` دکمه را تا پایانِ کار قفل می‌کند، تا دو بار پشت‌سرهم
  زده نشود.
- خطای **غیر از** `AbortError` به مسیر کپی می‌ریزد، نه به شکست: اگر
  `share` از کار افتاده باشد، دست مشتری خالی نمی‌ماند.

### چرا نشانی از `canonical` می‌آید

لینکی که مشتری برای دوستش می‌فرستد باید **دقیقاً** همان آدرسی باشد که
در `canonical` و `og:url` صفحه نوشته شده. اگر نبود، پیش‌نمایشی که
تلگرام و واتساپ می‌سازند به یک آدرس نگاه می‌کند و لینک به آدرسی دیگر
می‌رود.

پس هیچ رشته‌ای دستی ساخته نمی‌شود: همان توصیفِ صفحه ساخته می‌شود و
`canonical` اش برداشته می‌شود — همان چیزی که `lib/metadata.js` به Next
می‌دهد و همان چیزی که `buildSitemap` در `shared/seo.js` می‌نویسد. سه
مصرف‌کننده، یک منبع.

`tests/share.test.js` این را صریح می‌سنجد، برای هر سه نوع کالا:

```js
const canonical = itemHeadState(item, { baseUrl: 'https://daneh.example' }).canonical;

expect(itemShareUrl(item, ENV)).toBe(canonical);
expect(itemShareUrl(item, ENV)).toBe(itemUrl('https://daneh.example', item));
```

### دوراهیِ وسط نمودار، و دامی که در آن بود

ملاکِ «برگهٔ سیستم یا کپی؟» **نوعِ نشانگر** است، نه بودنِ
`navigator.share`. تحلیل کاملش در تصمیم ۲۸ فصل ۹ است؛ خلاصه‌اش این:
کرومِ ویندوز `navigator.share` **دارد**، ولی برگه‌ای که باز می‌کند
پنجرهٔ خالیِ خودِ ویندوز است که بی‌کار بسته می‌شود — و در آن مسیر
هیچ‌وقت کاری به کلیپ‌بورد نمی‌رسید. یعنی کاربر دسکتاپ دکمه را می‌زد،
پنلی می‌آمد و می‌رفت، و لینک هیچ‌جا کپی نشده بود.

### چهار پایان، و اینکه دو تایشان ساکت‌اند

| `mode` | چه اتفاقی افتاده | توست |
|---|---|---|
| `shared` | برگهٔ سیستم باز شد و کاربر فرستاد | ندارد — خودِ برگه بازخورد داده |
| `canceled` | کاربر برگه را بست | ندارد — نظرش عوض شده، خطایی نبوده |
| `copied` | لینک در کلیپ‌بورد است | «لینک این کالا کپی شد — حالا می‌توانید بفرستیدش» |
| `failed` | نه `share` و نه کپی | «کپی نشد — نشانی این صفحه را از نوار مرورگر بردارید» |

پیامِ `failed` عمداً راهنمایی است نه اعلام خطا: کاری که کاربر می‌خواست
هنوز شدنی است، فقط دستی.

### و اینکه چرا توست از کانتکست نمی‌آید

سومین نقطهٔ شروعِ این جریان، مودالِ رهگیری‌شده است — و آن در شکافِ
`@modal` رندر می‌شود، **بیرون** از `ShopProvider` صفحه. پس پیام از
انبارهٔ ماژولیِ `lib/toastStore.js` می‌آید و `<Toast />` یک بار در
`app/layout.jsx` می‌نشیند، بالای هر دو شکاف. تصمیم ۲۶ فصل ۹.

---

## ۶.۱۲ نمودار وضعیت سفارش

```
                    ┌─────────┐
     ثبت سفارش ────►│   new   │  (پیش‌فرض)
                    │  تازه   │
                    └────┬────┘
                         │ مدیر
              ┌──────────┼──────────┐
              ▼          ▼          ▼
      ┌──────────────┐  ┌──────┐  ┌──────────┐
      │  processing  │  │ done │  │ canceled │
      │ در حال آماده‌سازی│ تحویل │  │ لغو شده  │
      └───────┬──────┘  └───┬──┘  └────┬─────┘
              │             │           │
              └─────────────┴───────────┘
                    مدیر می‌تواند به هر وضعیتی برود
                    (هیچ محدودیت گذاری وجود ندارد)
```

**نکتهٔ مهم:** `canceled` تنها وضعیتی است که در محاسبات آماری اثر دارد:

- در `stats.js`: `{ $match: { status: { $ne: 'canceled' } } }`
- در `reports.js` تابع `addOrder`:
  ```js
  if (o.status === 'canceled') { stats.canceled += 1; return; }
  ```
- اما در خروجی پشتیبان **می‌ماند** — کامنت بالای `reports.js`:
  «سفارش لغوشده در «فروش» حساب نمی‌شود ولی در فهرست و در فایل پشتیبان
  می‌ماند — پشتیبان باید کامل باشد.»

انتقال وضعیت هیچ محدودیتی ندارد؛ مدیر می‌تواند از `done` به `new`
برگردد. برای این اندازه از کسب‌وکار (یک رستری کوچک) منطقی است، اما در
سیستم بزرگ‌تر یک ماشین حالت با گذارهای مجاز لازم بود.
