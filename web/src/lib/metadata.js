/* ══════════════════════════════════════════════════
   از توصیفِ <head> به شیء metadata نکست.

   ── چه چیزی را جایگزین می‌کند ──
   پیش از مهاجرت، یک توصیفِ صفحه (خروجی itemHeadState)
   دو مصرف‌کننده داشت که باید مو به مو یکی می‌ماندند: یکی
   در مرورگر که آن را به عنصر DOM تبدیل می‌کرد، و یکی در
   سرور که رشتهٔ HTML می‌ساخت و داخل صفحه تزریقش می‌کرد.

   دوگانگی‌شان خطر واقعی بود و یک تستِ اختصاصی داشت که
   همراه هر دو حذف شد. حالا یک رندرکننده بیشتر نیست: خودِ
   Next. این فایل تنها پلِ میانِ همان توصیف و شیئی است که
   Next می‌فهمد.

   ── چرا باز هم از itemHeadState می‌آید ──
   می‌شد همین‌جا مستقیم عنوان و توضیح ساخت. نساختیم، چون
   sitemap و هر مصرف‌کنندهٔ آیندهٔ دیگری همان تابع را صدا
   می‌زنند؛ نگه داشتن یک منبع، همان قاعدهٔ pricing.js است.

   ── قرارداد ──
   خروجی باید **دقیقاً همان مقادیری** را داشته باشد که
   headTags(state) می‌ساخت — نه بیشتر، نه کمتر.
   tests/next-metadata.test.js همین را می‌سنجد، تگ‌به‌تگ.
   ══════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════
   og:type — تنها جایی که Next کم آورد.

   itemHeadState برای صفحهٔ کالا og:type را «product»
   می‌گذارد — همان چیزی که فیس‌بوک و تلگرام برای کارتِ
   کالا می‌خوانند، و همان چیزی که پیش از این مهاجرت هم
   در <head> صفحهٔ کالا بود.

   Next اما فهرست بستهٔ خودش را دارد (website, article,
   book, profile, music.*, video.*) و برای هر چیز دیگری
   موقع رندر **خطا می‌دهد** — یعنی کل <head> صفحه خالی
   می‌ماند، نه اینکه فقط یک تگ بیفتد. اولین بار همین شد:
   صفحهٔ کالا بدنهٔ درست داشت و هیچ عنوانی نداشت.

   راه‌های موجود و اینکه چرا رد شدند:

   • metadata.other → تگ را با name می‌نویسد نه property،
     و خزندهٔ Open Graph سراغ property می‌رود. یعنی تگی
     که هست ولی خوانده نمی‌شود؛ از نبودش بدتر.
   • عوض کردنش به 'website' → کالا دیگر کالا نیست. یک
     عقب‌گرد واقعی نسبت به امروز.

   پس این یک تگ از راه Metadata API نمی‌رود و خودِ صفحه
   رندرش می‌کند (ری‌اکت ۱۹ عنصرهای <meta> را به <head>
   می‌برد). بقیهٔ تگ‌ها همان مسیر همیشگی را می‌روند.

   اگر روزی Next فهرستش را باز کند، فقط همین مجموعه را
   بزرگ کنید و آن یک خط از صفحه برداشته می‌شود.
   ══════════════════════════════════════════════════ */
export const NEXT_OG_TYPES = new Set([
  'website',
  'article',
  'book',
  'profile',
  'music.song',
  'music.album',
  'music.playlist',
  'music.radio_station',
  'video.movie',
  'video.episode',
  'video.tv_show',
  'video.other'
]);

/**
 * og:type ای که Next نمی‌پذیرد و صفحه باید خودش
 * رندرش کند. رشتهٔ خالی یعنی چیزی برای جبران نیست.
 */
export const ogTypeFallback = (state = {}) =>
  state.ogType && !NEXT_OG_TYPES.has(state.ogType) ? state.ogType : '';

/**
 * @param state خروجی itemHeadState یا notFoundHeadState
 * @returns شیء metadata برای App Router
 */
export function toNextMetadata(state = {}) {
  const title = state.ogTitle || state.title;
  const description = state.ogDescription || state.description;

  const meta = {};

  if (state.title) meta.title = state.title;
  if (state.description) meta.description = state.description;

  /* robots فقط وقتی نوشته می‌شود که صفحه واقعاً چیزی
     برای گفتن داشته باشد — همان شرطی که headTags دارد.
     رشته را به شکل ساخت‌یافتهٔ Next تبدیل می‌کنیم تا
     خروجی‌اش با «noindex, follow» یکی دربیاید. */
  if (state.robots) {
    const parts = String(state.robots)
      .split(',')
      .map((s) => s.trim().toLowerCase());
    meta.robots = {
      index: !parts.includes('noindex'),
      follow: !parts.includes('nofollow')
    };
  }

  /* صفحه‌ای که وجود ندارد نسخهٔ متعارف ندارد؛ پس
     alternates فقط وقتی ساخته می‌شود که canonical باشد. */
  if (state.canonical) meta.alternates = { canonical: state.canonical };

  /* ── Open Graph ──
     همان ترتیب و همان انتخاب‌های headTags. کلیدهای خالی
     ساخته نمی‌شوند: Next مقدارِ undefined را تگ نمی‌کند،
     ولی نساختنش خوانا‌تر است و تست را دقیق نگه می‌دارد. */
  const og = {};
  /* نوعی که Next نمی‌شناسد اینجا نوشته نمی‌شود، وگرنه
     رندر متادیتا خطا می‌دهد و کل <head> از دست می‌رود.
     جبرانش با ogTypeFallback است — بالای فایل. */
  if (state.ogType && NEXT_OG_TYPES.has(state.ogType)) og.type = state.ogType;
  if (state.siteName) og.siteName = state.siteName;
  if (state.locale) og.locale = state.locale;
  if (title) og.title = title;
  if (description) og.description = description;
  if (state.canonical) og.url = state.canonical;
  if (state.image) {
    og.images = [{ url: state.image, ...(state.imageAlt ? { alt: state.imageAlt } : {}) }];
  }
  if (Object.keys(og).length) meta.openGraph = og;

  /* ── توییتر ──
     نوع کارت به داشتنِ تصویر بستگی دارد — همان قاعدهٔ
     headTags. صفحهٔ ۴۰۴ که تصویر ندارد کارت ساده می‌گیرد. */
  const twitter = { card: state.image ? 'summary_large_image' : 'summary' };
  if (title) twitter.title = title;
  if (description) twitter.description = description;
  if (state.image) twitter.images = [state.image];
  meta.twitter = twitter;

  return meta;
}
