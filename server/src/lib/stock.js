/* ══════════════════════════════════════════════════
   رزرو موجودی هنگام ثبت سفارش.

   مسئلهٔ اصلی، رقابت است: دو مشتری هم‌زمان آخرین ۵۰۰
   گرم یرگاچف را سفارش می‌دهند. اگر اول بخوانیم و بعد
   بنویسیم، هر دو «۵۰۰ گرم موجود است» را می‌بینند و هر
   دو سفارش ثبت می‌شود — یک کیلو فروخته‌ایم که نداریم.

   راه‌حل، یک عملیات اتمیِ مونگو است:

     findOneAndUpdate({ slug, stock: { $gte: need } },
                      { $inc: { stock: -need } })

   شرط و کاهش با هم و در یک قفل سند انجام می‌شوند، پس
   دقیقاً یکی از آن دو مشتری برنده می‌شود و دیگری null
   می‌گیرد. هیچ transaction ای هم لازم نیست (که روی
   مونگوی تک‌گرهی اصلاً در دسترس نیست).

   نکتهٔ مهم دربارهٔ null: کالای «نامحدود» را اصلاً لمس
   نمی‌کنیم. هم چون $inc روی null خطا می‌دهد، و هم چون
   شرط { $gte: need } به‌درستی با null جور نمی‌شود —
   یعنی حتی اگر اشتباهاً صدایش بزنیم، همه‌چیز به‌جای
   خراب شدن، «ناموجود» می‌شود.

   و چون هر ردیف جدا رزرو می‌شود، ممکن است ردیف سوم
   شکست بخورد بعد از آنکه دو ردیف اول کم شده‌اند. پس
   هر رزرو موفق را نگه می‌داریم تا در شکست، همه را با
   هم برگردانیم — سفارش یا کامل ثبت می‌شود یا اصلاً.
   ══════════════════════════════════════════════════ */

/** چند واحد از این ردیف کم می‌شود: گرم برای وزنی، عدد برای ابزار */
export function unitsFor(line) {
  const n = line.kind === 'gear' ? Number(line.qty) : Number(line.grams);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/** موجودی این کالا شمرده می‌شود یا نامحدود است؟ */
export function isTracked(item) {
  return typeof item?.stock === 'number' && Number.isFinite(item.stock);
}

/* پیام فارسی خوانا — واحد را از نوع کالا می‌گیرد */
function shortMessage(item, left) {
  const unit = item.kind === 'gear' ? 'عدد' : 'گرم';
  if (left <= 0) return `«${item.name}» فعلاً موجود نیست`;
  return `موجودی «${item.name}» کافی نیست — فقط ${left} ${unit} مانده است`;
}

/**
 * موجودی همهٔ ردیف‌ها را رزرو می‌کند.
 *
 * @returns {{ error: string, taken: [] } | { error: null, taken: Array }}
 *   در صورت شکست، هرچه رزرو شده بود قبل از بازگشت پس داده می‌شود.
 */
export async function reserveStock(lines, ItemModel) {
  const taken = [];

  for (const line of lines) {
    const item = line.item;
    if (!isTracked(item)) continue; // نامحدود

    const need = unitsFor(line);
    if (need <= 0) continue;

    const updated = await ItemModel.findOneAndUpdate(
      { slug: item.slug, stock: { $gte: need } },
      { $inc: { stock: -need } },
      { new: true, projection: { stock: 1 } }
    );

    if (!updated) {
      /* هرچه تا اینجا برداشته‌ایم برمی‌گردد */
      await releaseStock(taken, ItemModel);

      /* موجودیِ واقعیِ همین لحظه را می‌خوانیم تا پیام
         دقیق باشد؛ عددی که در حافظه داشتیم ممکن است
         مالِ چند لحظه پیش باشد. */
      const fresh = await ItemModel.findOne({ slug: item.slug }, { stock: 1 }).lean();
      const left = typeof fresh?.stock === 'number' ? fresh.stock : 0;
      return { error: shortMessage(item, left), taken: [] };
    }

    taken.push({ slug: item.slug, amount: need });
  }

  return { error: null, taken };
}

/** برگرداندن رزروها — هم در شکست وسط کار، هم اگر ثبت سفارش خطا بدهد */
export async function releaseStock(taken, ItemModel) {
  if (!taken?.length) return;
  await Promise.all(
    taken.map((t) => ItemModel.updateOne({ slug: t.slug }, { $inc: { stock: t.amount } }))
  );
}
