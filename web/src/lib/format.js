/* قالب‌بندی اعداد و وزن — عیناً مثل نسخهٔ اولیهٔ سایت */

export const toFa = (n) => Number(n || 0).toLocaleString('fa-IR');

export const money = (n) => toFa(n) + ' تومان';

export function formatWeight(g) {
  if (g < 1000) return toFa(g) + ' گرم';
  const kg = g / 1000;
  return toFa(Number.isInteger(kg) ? kg : kg.toFixed(2)) + ' کیلوگرم';
}

/* عددهای فارسی و عربی را به لاتین برمی‌گرداند تا مدیر
   بتواند قیمت را با کیبورد فارسی هم بنویسد. */
export function toLatinDigits(str) {
  return String(str ?? '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/,/g, '');
}

/* تاریخ سفارش به شمسی */
export function faDate(iso) {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(iso));
  } catch {
    return '';
  }
}
