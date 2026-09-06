'use client';

import { useSyncExternalStore } from 'react';
import { subscribeToast, getToast, getServerToast } from '../lib/toastStore.js';

/* ══════════════════════════════════════════════════
   توست — تنها راهِ «شد» گفتن به مشتری.

   تا پیش از این چند خط داخل HomeShell بود، یعنی فقط
   صفحهٔ اصلی داشتش: صفحهٔ کالا و مودالِ کالا هر دو
   بی‌صدا بودند. حالا یک کامپوننت است و **یک بار** در
   app/layout.jsx می‌نشیند، پس هر صفحه و هر شکافی از
   درخت آن را دارد.

   به ShopContext وصل نیست و عمداً: مودال بیرون از
   Provider رندر می‌شود. دلیل کاملش پای lib/toastStore.js.
   ══════════════════════════════════════════════════ */

export default function Toast() {
  const message = useSyncExternalStore(subscribeToast, getToast, getServerToast);

  return (
    <div className={`toast ${message ? 'is-on' : ''}`.trim()} role="status" aria-live="polite">
      {message}
    </div>
  );
}
