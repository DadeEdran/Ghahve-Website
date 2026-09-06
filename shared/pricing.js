/* ══════════════════════════════════════════════════
   محاسبهٔ قیمت — تنها نسخه.

   تا پیش از این دو نسخهٔ یکسان از این فایل وجود داشت،
   یکی سمت رابط کاربری و یکی در سرور، که باید دستی همگام
   می‌ماندند. خطرش این بود که کسی پله‌های تخفیف را در
   یکی عوض کند و عددی که مشتری می‌بیند با عددی که ثبت
   می‌شود فرق کند — بی هیچ خطایی.

   حالا هر دو طرف همین یک فایل را import می‌کنند، پس
   واگرایی از اساس ممکن نیست.

   یادآوری: سرور همچنان قیمت را از نو حساب می‌کند و به
   عددِ ارسالی از مرورگر اعتماد نمی‌کند. یکی بودنِ فرمول
   جای آن بازمحاسبه را نمی‌گیرد؛ فقط تضمین می‌کند نتیجه
   با چیزی که کاربر دیده یکی دربیاید.
   ══════════════════════════════════════════════════ */

/* جدول پله‌ها عمداً ستون‌به‌ستون چیده شده و اعشارها کامل
   نوشته شده‌اند (0.10 نه 0.1) تا کنار هم خوانده شوند —
   این یک جدول است، نه چند سطر کد. prettier کاری با آن ندارد. */
// prettier-ignore
export const TIERS = [
  { min: 5000, rate: 0.15, label: '۱۵٪' },
  { min: 3000, rate: 0.10, label: '۱۰٪' },
  { min: 1000, rate: 0.05, label: '۵٪'  },
  { min: 0,    rate: 0,    label: ''    }
];

export const SHIPPING = 65000; // تومان
export const FREE_SHIPPING_FROM = 1000; // گرم

/** قیمت را به نزدیک‌ترین ۱۰۰۰ تومان گرد می‌کند */
export const priceFor = (pricePerKg, grams) =>
  Math.round((pricePerKg * grams) / 1000 / 1000) * 1000;

/**
 * قیمت هر کیلوی یک میکس = میانگین وزنیِ قیمت دانه‌ها + دستمزد میکس.
 *
 * mix: [{ slug, percent }]  — ترکیبی که مشتری انتخاب کرده
 * lookup: تابعی که با slug، کالای دانه را برمی‌گرداند
 *
 * اگر دانه‌ای پیدا نشود یا ترکیب خالی باشد، به قیمت خودِ میکس
 * برمی‌گردیم تا هیچ‌وقت عدد بی‌معنی درنیاید.
 */
export function blendPricePerKg(item, mix, lookup) {
  const parts = Array.isArray(mix) && mix.length ? mix : item.components || [];
  if (!parts.length) return item.price;

  let total = 0;
  let percentSum = 0;

  for (const p of parts) {
    const bean = lookup(p.slug);
    if (!bean) return item.price; // ترکیب ناقص — به قیمت پایه برگرد
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

/** قیمت هر کیلوی یک ردیف سبد، با در نظر گرفتن میکس */
export function unitPriceFor(line, lookup) {
  if (line.item.isBlend && lookup) {
    return blendPricePerKg(line.item, line.mix, lookup);
  }
  return line.item.price;
}

/**
 * جمع سبد.
 * lines: [{ kind, item, grams, qty, mix }] — item همان سند کالاست.
 * تخفیف پلکانی فقط روی کالاهای وزنی (قهوه و پودر) اعمال می‌شود.
 */
export function computeTotals(lines, lookup) {
  let grams = 0,
    pieces = 0;
  let weighedBase = 0,
    gearBase = 0;

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
    grams,
    pieces,
    base,
    discount,
    discountLabel: tier.label,
    shipping,
    total: base - discount + shipping
  };
}

/** قیمت یک ردیف سبد */
export function lineTotal(l, lookup) {
  return l.kind === 'gear' ? l.item.price * l.qty : priceFor(unitPriceFor(l, lookup), l.grams);
}
