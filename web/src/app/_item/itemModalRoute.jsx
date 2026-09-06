import { SEGMENT_KIND } from '@ghahve/shared/seo.js';
import { DEFAULT_GRINDS } from '../../lib/groups.js';
import { getItem, getItems, getContent } from '../../lib/data.js';
import ItemModal from './ItemModal.jsx';

/* ══════════════════════════════════════════════════
   نیمهٔ سروریِ مودال کالا — پیاده‌سازی مشترک سه شکاف.

   کارش فقط جمع کردن داده است: خودِ کالا، نام دانه‌های
   میکس، و برچسب دو آسیابی که متنِ معرفی به آن‌ها اشاره
   می‌کند. هر سه به شکل دادهٔ ساده به مودال می‌روند؛ دلیلش
   بالای ItemModal.jsx آمده.

   ── چرا اینجا <head> ای ساخته نمی‌شود ──
   مودال روی صفحه‌ای باز می‌شود که خودش عنوان و canonical
   دارد. در نسخهٔ ویت مجبور بودیم عنوان را عوض کنیم (و
   برای همین head.js آن پشتهٔ سه‌حالته را داشت تا با بستن
   مودال عنوان صفحهٔ زیر برگردد). حالا آدرس واقعاً عوض
   شده و مسیرِ کامل هم همان تگ‌ها را دارد، پس اگر کاربر
   لینک را کپی کند یا رباتی سراغ همان آدرس برود، همان
   صفحهٔ کامل و همان <head> را می‌گیرد.

   اگر کالا پیدا نشد چیزی رندر نمی‌شود: صفحهٔ زیر
   دست‌نخورده می‌ماند و آدرسِ کامل خودش ۴۰۴ می‌دهد.
   ══════════════════════════════════════════════════ */

export default async function ItemModalRoute({ segment, params }) {
  const { slug } = await params;
  const item = await getItem(SEGMENT_KIND[segment], slug);
  if (!item) return null;

  /* نام دانه‌ها فقط برای میکس‌ها لازم است */
  let beanNames = {};
  if (item.isBlend && item.components?.length) {
    const beans = await getItems('coffee');
    const wanted = new Set(item.components.map((c) => c.slug));
    beanNames = Object.fromEntries(
      beans.filter((b) => wanted.has(b.slug)).map((b) => [b.slug, b.name])
    );
  }

  /* ── برچسب آسیاب ──
     متنِ ItemBody فقط به دو گزینه اشاره می‌کند («از
     اسپرسو تا فرنچ‌پرس»)، ولی مدیر می‌تواند برچسبشان را
     در پنل عوض کند. پس همان دو تا از محتوا خوانده
     می‌شوند، نه بیشتر. */
  const content = await getContent();
  const options =
    Array.isArray(content?.grinds?.options) && content.grinds.options.length
      ? content.grinds.options
      : DEFAULT_GRINDS;

  const grindLabels = Object.fromEntries(
    ['espresso', 'french'].map((v) => [v, options.find((o) => o.value === v)?.label || ''])
  );

  return <ItemModal item={item} beanNames={beanNames} grindLabels={grindLabels} />;
}
