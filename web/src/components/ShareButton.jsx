'use client';

import { useState } from 'react';
import { toast } from '../lib/toastStore.js';
import { shareItem, SHARE_COPIED, SHARE_FAILED } from '../lib/share.js';

/* ══════════════════════════════════════════════════
   دکمهٔ «برای دوستت بفرست».

   ── چرا هست ──
   خیلی از مشتری‌ها نشانی صفحه را از نوار مرورگر
   برنمی‌دارند؛ روی موبایل اصلاً نوار مرورگر را نمی‌بینند.
   این دکمه همان کار را یک ضربه‌ای می‌کند: روی موبایل
   برگهٔ خودِ سیستم (تلگرام، واتساپ، پیامک) و روی
   دسکتاپ کپی در کلیپ‌بورد با یک توست فارسی.

   ── چند نکتهٔ ریز که عمدی‌اند ──
   • <button type="button"> واقعی است، نه <a> و نه div
     کلیک‌پذیر: نه ناوبری می‌کند و نه فرمی را می‌فرستد.
   • stopPropagation دارد چون داخل کارتی می‌نشیند که پر
     از کنترل است؛ کلیکش نباید به هیچ‌چیز دیگری برسد.
   • aria-label نام کالا را دارد، وگرنه در فهرستی از
     صد کارت، صد دکمهٔ «هم‌رسانی» بی‌تفاوت می‌شدند.
   • تا وقتی برگهٔ سیستم باز است دکمه قفل می‌شود تا
     دو بار پشت‌سرهم زده نشود.
   • توست را از انبارهٔ ماژولی می‌گیرد، نه از ShopContext:
     همین دکمه داخل مودالِ کالا هم می‌نشیند و آنجا
     Provider ای در کار نیست.

   منطقِ آدرس و کپی اینجا نیست، در lib/share.js است —
   چون تابع خالص تست می‌شود و کامپوننت نه.
   ══════════════════════════════════════════════════ */

export default function ShareButton({ item, className = '' }) {
  const [busy, setBusy] = useState(false);

  const onShare = async (e) => {
    /* کارت ممکن است روزی داخل چیز کلیک‌پذیری بنشیند؛
       این دکمه به هر حال نباید صفحه را عوض کند. */
    e.preventDefault();
    e.stopPropagation();

    if (busy) return;
    setBusy(true);
    try {
      const { mode } = await shareItem(item);
      /* برگهٔ سیستم خودش بازخورد داده؛ توست دوباره اضافه
         است. لغو هم یعنی کاربر نخواست — سکوت. */
      if (mode === 'copied') toast(SHARE_COPIED);
      else if (mode === 'failed') toast(SHARE_FAILED);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={`share-btn ${className}`.trim()}
      onClick={onShare}
      disabled={busy}
      aria-label={`هم‌رسانی ${item?.name || 'این کالا'}`}
      title="ارسال برای دوستان"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="17.5" cy="5.5" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="6.5" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="17.5" cy="18.5" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M15.2 6.8 8.8 10.4M8.8 13.6l6.4 3.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
