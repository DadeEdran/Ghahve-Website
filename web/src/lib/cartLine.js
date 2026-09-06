/* ══════════════════════════════════════════════════
   ساختنِ یک ردیف سبد.

   این منطق تا پیش از این داخل `addWeighed` در ShopContext
   زندگی می‌کرد. حالا که میکس را می‌شود از دو راه ساخت —
   اهرم‌های ساده و حالت تصویری — باید جایی می‌بود که هر دو
   راه از آن رد شوند و بشود بی‌مرورگر تستش کرد: تضمینِ
   «یک میکس، از هر راهی که ساخته شود، دقیقاً همان ردیف سبد».

   ShopContext همچنان تنها جایی است که سبد را عوض می‌کند؛
   اینجا فقط شکلِ ردیف ساخته می‌شود، بدون هیچ حالتی.
   ══════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════
   شناسهٔ یک ردیف سبد.
   یک قهوه می‌تواند چند بار در سبد باشد — یک بار دانهٔ
   کامل و یک بار آسیاب اسپرسو — و یک میکس با دو نسبت
   متفاوت هم دو ردیف جداست. پس شناسهٔ ردیف از شناسهٔ
   کالا، نحوهٔ آسیاب و ترکیب میکس ساخته می‌شود.
   ══════════════════════════════════════════════════ */
export function mixSignature(mix) {
  if (!Array.isArray(mix) || mix.length === 0) return '';
  return [...mix]
    .filter((m) => Number(m.percent) > 0)
    .map((m) => `${m.slug}:${Math.round(Number(m.percent) || 0)}`)
    .sort()
    .join(',');
}

export const lineKey = (slug, grind, mix) => `${slug}|${grind || ''}|${mixSignature(mix)}`;

/* ترکیبِ ذخیره‌شدنی: دانه‌های صفرشده کنار می‌روند و درصدها
   گِرد می‌شوند. کالای غیرمیکس ترکیب ندارد، و میکسی که مشتری
   دست نزده باشد به پیشنهاد خودمان برمی‌گردد.

   ترتیب دانه‌ها همان ترتیب ورودی می‌ماند — حالت تصویری هم
   با همین ترتیب کیسه‌ها را می‌ریزد، پس نباید اینجا مرتب شود. */
export function normalizeMix(item, mix) {
  if (!item?.isBlend) return [];
  if (Array.isArray(mix) && mix.length) {
    return mix
      .filter((m) => Number(m.percent) > 0)
      .map((m) => ({ slug: m.slug, percent: Math.round(Number(m.percent)) }));
  }
  return (item.components || []).map((c) => ({ slug: c.slug, percent: c.percent }));
}

/**
 * ردیف تازهٔ سبد برای کالای وزنی.
 * item: سند کالا · grams: وزن · opts: { grind, mix } · fallbackGrind: آسیاب پیش‌فرض سایت
 */
export function buildLine(item, grams, opts = {}, fallbackGrind = '') {
  /* آسیاب فقط برای قهوه معنی دارد؛ پودر آسیاب نمی‌خورد */
  const grind = item.grindable ? (opts.grind ?? fallbackGrind) : '';
  const mix = normalizeMix(item, opts.mix);

  return {
    key: lineKey(item.slug, grind, mix),
    slug: item.slug,
    kind: item.kind,
    grams,
    qty: 0,
    grind,
    mix
  };
}
