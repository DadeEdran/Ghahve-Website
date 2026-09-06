/* ══════════════════════════════════════════════════
   ریاضیِ میکس.

   مشتری نسبت هر دانه را خودش انتخاب می‌کند و مجموع
   همیشه ۱۰۰ می‌ماند: وقتی یک اهرم را می‌کشد، بقیه
   به‌اندازهٔ جای خالی‌شان جابه‌جا می‌شوند.

   ترکیبی که ما پیشنهاد داده‌ایم فقط «نقطهٔ شروع» است —
   هیچ دانه‌ای اجباری نیست، هیچ درصدی قفل نیست، و مشتری
   می‌تواند هر قهوه‌ای از فهرست را جای آن بگذارد.
   تنها قاعده این است که میکس دست‌کم دو دانه داشته باشد.
   ══════════════════════════════════════════════════ */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ترکیب اولیه: همان چیزی که ما پیشنهاد داده‌ایم */
export const startingMix = (item) =>
  (item.components || []).map((c) => ({ slug: c.slug, percent: Math.round(c.percent) }));

export const sumOf = (parts) => parts.reduce((s, p) => s + (Number(p.percent) || 0), 0);

/**
 * درصد یک دانه را عوض می‌کند و بقیه را جوری جابه‌جا
 * می‌کند که مجموع دقیقاً ۱۰۰ بماند.
 *
 * هر دانه می‌تواند از ۰ تا ۱۰۰ برود. اگر به ۰ برسد یعنی
 * مشتری عملاً برش داشته است.
 */
export function applyPercent(parts, slug, raw) {
  const self = parts.find((p) => p.slug === slug);
  if (!self) return parts;

  const others = parts.filter((p) => p.slug !== slug);
  if (others.length === 0) return parts;

  const want = clamp(Math.round(Number(raw) || 0), 0, 100);
  let delta = want - self.percent;
  if (delta === 0) return parts;

  /* جای خالی بقیه در جهتی که باید حرکت کنند:
     اگر این دانه زیاد می‌شود، بقیه باید کم شوند. */
  const roomOf = (p) => (delta > 0 ? p.percent : 100 - p.percent);

  const totalRoom = others.reduce((s, p) => s + Math.max(0, roomOf(p)), 0);
  if (totalRoom <= 0) return parts;

  const need = Math.min(Math.abs(delta), totalRoom);
  const dir = delta > 0 ? 1 : -1;
  const target = self.percent + dir * need;

  /* سهم هر دانه به نسبت جای خالی‌اش */
  const shares = others.map((p) => {
    const room = Math.max(0, roomOf(p));
    return { slug: p.slug, room, take: Math.floor((need * room) / totalRoom) };
  });

  /* باقیماندهٔ گِردکردن را یکی‌یکی پخش می‌کنیم تا
     مجموع مو به مو درست دربیاید. */
  let left = need - shares.reduce((s, x) => s + x.take, 0);
  for (let i = 0; left > 0 && i < shares.length * 200; i++) {
    const s = shares[i % shares.length];
    if (s.take < s.room) {
      s.take++;
      left--;
    }
  }

  const takeBy = new Map(shares.map((s) => [s.slug, s.take]));

  return parts.map((p) => {
    if (p.slug === slug) return { ...p, percent: target };
    const take = takeBy.get(p.slug);
    if (!take) return p;
    return { ...p, percent: p.percent - dir * take };
  });
}

/* افزودن دانهٔ تازه به میکس — سهمش را از بقیه می‌گیرد */
export function addBean(parts, slug, share = 20) {
  if (parts.some((p) => p.slug === slug)) return parts;
  const withNew = [...parts, { slug, percent: 0 }];
  return applyPercent(withNew, slug, share);
}

/* برداشتن یک دانه — سهمش بین بقیه پخش می‌شود.
   میکس نباید به کمتر از دو دانه برسد. */
export function removeBean(parts, slug) {
  if (parts.length <= 2) return parts;
  const zeroed = applyPercent(parts, slug, 0);
  return zeroed.filter((p) => p.slug !== slug);
}

/* آیا این ترکیب قابل سفارش است؟ همان قواعدی که سرور هم بررسی می‌کند. */
export function mixError(parts) {
  const live = parts.filter((p) => p.percent > 0);
  if (live.length < 2) return 'میکس باید دست‌کم دو دانه داشته باشد';
  const sum = sumOf(live);
  if (Math.abs(sum - 100) > 1) return `مجموع درصدها باید ۱۰۰ باشد، الان ${sum} است`;
  return '';
}
