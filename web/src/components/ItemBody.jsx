import { TASTES, KINDS } from '../lib/groups.js';
import { toFa } from '../lib/format.js';

/* ══════════════════════════════════════════════════
   متن معرفی یک کالا — بدنهٔ مشترک.

   دو جا نشان داده می‌شود: داخل مودال «دربارهٔ این قهوه»
   و در صفحهٔ اختصاصی /coffee/:slug. یکی بودنشان عمدی
   است — چیزی که گوگل در صفحه می‌خواند باید دقیقاً همان
   باشد که مشتری در مودال می‌بیند، وگرنه دو متن با هم
   واگرا می‌شوند.

   headingLevel پارامتر است چون سلسله‌مراتب عنوان‌ها در
   دو جا فرق دارد: در مودال زیر h2 عنوان کالا می‌نشیند
   (پس h3)، و در صفحه زیر h1 (پس h2).

   ── چرا نام دانه و برچسب آسیاب پارامترند، نه از کانتکست ──
   این کامپوننت دو مصرف‌کننده دارد که در دو محیط زندگی
   می‌کنند: صفحهٔ کالا که **سروری** است و کانتکستی ندارد،
   و مودالِ کالا که در مرورگر است.

   اگر خودش useShop را صدا می‌زد، فقط در مودال کار می‌کرد
   و صفحه به نسخهٔ دومی نیاز پیدا می‌کرد — یعنی همان
   دوگانگی‌ای که این فایل برای پرهیز از آن ساخته شده. با
   پارامتر شدن، یک فایل هر دو جا کار می‌کند: صفحه نام
   دانه‌ها را از سرور می‌دهد، و مودال از useShop.

   پیش‌فرض‌ها عمداً همان رفتار قبلی را می‌دهند: نامِ دانهٔ
   ناشناخته همان slug است، و برچسب آسیابِ نبوده به همان
   «اسپرسو» و «فرنچ‌پرس» متن اصلی برمی‌گردد.
   ══════════════════════════════════════════════════ */

/* آیا این کالا اصلاً معرفی نوشته‌شده دارد؟ */
export const hasStory = (item) => Boolean(item?.story || item?.taste || item?.recommend);

/* بلوک‌های متنی به ترتیبی که مشتری می‌خواندشان */
export const storyBlocks = (item) =>
  [
    { key: 'story', title: 'این قهوه از کجا می‌آید', text: item?.story },
    { key: 'taste', title: 'در فنجان چه می‌چشید', text: item?.taste },
    { key: 'recommend', title: 'پیشنهاد ما برای دم کردن', text: item?.recommend }
  ].filter((b) => b.text);

export default function ItemBody({
  item,
  headingLevel = 'h3',
  beanName = (slug) => slug,
  grindLabel = () => ''
}) {
  const H = headingLevel;

  if (!item) return null;

  const kind = KINDS[item.kind] || KINDS.coffee;
  const group = kind.groups[item.group];
  const blocks = storyBlocks(item);

  return (
    <>
      <div className="sheet-tags">
        {group ? <span className="chip-static">{group.label}</span> : null}
        {(item.tastes || []).map((t) => (
          <span className="chip-taste" key={t}>
            {TASTES[t] || t}
          </span>
        ))}
        {item.notes?.map((n, i) => (
          <span className="chip-note" key={i}>
            {n}
          </span>
        ))}
      </div>

      {/* ترکیب رسمی میکس — تا مشتری بداند داخلش چیست */}
      {item.isBlend && item.components?.length ? (
        <div className="sheet-block">
          <H>ترکیب این میکس</H>
          <ul className="sheet-mix">
            {item.components.map((c) => (
              <li key={c.slug}>
                <span>{beanName(c.slug) || c.slug}</span>
                <b>٪{toFa(c.percent)}</b>
              </li>
            ))}
          </ul>
          {item.customizable ? (
            <p className="sheet-hint">
              این فقط پیشنهاد ماست — در بخش میکس‌ها می‌توانید نسبت‌ها را عوض کنید، دانه‌ای را
              بردارید، یا هر قهوهٔ دیگری از فهرست را جایش بگذارید.
            </p>
          ) : null}
        </div>
      ) : null}

      {blocks.map((b) => (
        <div className="sheet-block" key={b.key}>
          <H>{b.title}</H>
          <p>{b.text}</p>
        </div>
      ))}

      {blocks.length === 0 && !item.isBlend ? (
        <p className="sheet-hint">برای این کالا هنوز معرفی کاملی ننوشته‌ایم.</p>
      ) : null}

      {item.grindable ? (
        <p className="sheet-hint">
          هر آسیابی که بخواهید رایگان انجام می‌شود — از {grindLabel('espresso') || 'اسپرسو'} تا{' '}
          {grindLabel('french') || 'فرنچ‌پرس'}. موقع افزودن به سبد انتخابش کنید.
        </p>
      ) : null}
    </>
  );
}
