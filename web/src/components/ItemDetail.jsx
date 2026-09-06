'use client';

import { useEffect, useRef } from 'react';
import { KINDS } from '../lib/groups.js';
import { money } from '../lib/format.js';
import CardArt from './CardArt.jsx';
import ShareButton from './ShareButton.jsx';
import ItemBody, { hasStory } from './ItemBody.jsx';

/* ══════════════════════════════════════════════════
   پنجرهٔ «دربارهٔ این قهوه».
   سه چیز را نشان می‌دهد: از کجا آمده، در فنجان چه
   می‌چشید، و ما چطور پیشنهاد می‌کنیم دمش کنید.
   متن‌ها از پنل مدیریت پر می‌شوند؛ هر بخشی که خالی
   باشد اصلاً نشان داده نمی‌شود.

   ── تفاوت با نسخهٔ ویت ──
   نام دانه‌های میکس و برچسب آسیاب پارامتر شده‌اند و به
   ItemBody پاس داده می‌شوند، چون آن کامپوننت در web
   کانتکست نمی‌خواند (دلیلش بالای خودش نوشته شده). این
   پنجره در مسیرِ رهگیری‌شده رندر می‌شود که بیرون از
   ShopProvider صفحه است، پس داده باید از بالا بیاید.

   از مورد ۲۷ به بعد این پنجره آدرس خودش را دارد:
   باز شدنش یک ورودی تازه در تاریخچهٔ مرورگر است و
   بستنش یک قدم به عقب. خودِ متن‌ها در ItemBody اند تا
   صفحهٔ اختصاصی همان‌ها را نشان بدهد.

   ── دکمهٔ هم‌رسانی ──
   همان آدرسی که بالا گفته شد، همان چیزی است که این دکمه
   می‌فرستد. بیشترِ بازدیدکننده‌ها کالا را از همین پنجره
   می‌بینند، نه از صفحهٔ کامل؛ نبودنش یعنی نبودنِ عملیِ
   قابلیت. تأییدش را هم به توستِ سراسری می‌دهد، که برای
   همین از انبارهٔ ماژولی می‌خواند نه از کانتکستی که
   اینجا اصلاً وجود ندارد.
   ══════════════════════════════════════════════════ */

export { hasStory };

export default function ItemDetail({ item, onClose, beanName, grindLabel }) {
  const panel = useRef(null);
  const lastFocus = useRef(null);

  useEffect(() => {
    lastFocus.current = document.activeElement;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      lastFocus.current?.focus?.();
    };
  }, [onClose]);

  if (!item) return null;

  const kind = KINDS[item.kind] || KINDS.coffee;

  return (
    <div className="sheet-back is-open" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheetTitle"
        tabIndex={-1}
        ref={panel}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-actions">
          <ShareButton item={item} className="sheet-share" />
          <button className="btn-close sheet-close" onClick={onClose} aria-label="بستن">
            ×
          </button>
        </div>

        <div className="sheet-head">
          <span className="sheet-art">
            <CardArt item={item} slot="sheet" priority />
          </span>
          <div>
            <p className="card-origin">{item.origin}</p>
            <h2 id="sheetTitle">{item.name}</h2>
            <p className="card-process">{item.spec}</p>
            <p className="sheet-price">
              <b>{money(item.price)}</b>
              <small>{kind.weighed ? 'هر کیلوگرم' : 'هر عدد'}</small>
            </p>
          </div>
        </div>

        <ItemBody item={item} headingLevel="h3" beanName={beanName} grindLabel={grindLabel} />
      </div>
    </div>
  );
}
