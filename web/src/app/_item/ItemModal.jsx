'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ItemDetail from '../../components/ItemDetail.jsx';

/* ══════════════════════════════════════════════════
   همان مودال «دربارهٔ این قهوه»، ولی پشت یک آدرس.

   ── چه چیزی جای backgroundLocation را گرفت ──
   در نسخهٔ ویت، لینک کارت‌ها موقعیت فعلی را با
   state={{ backgroundLocation }} همراه خودشان می‌فرستادند
   و App.jsx با دیدن آن، جدول مسیرها را دو بار رندر می‌کرد:
   یک بار برای صفحهٔ زیر و یک بار برای مودال.

   App Router خودش این را دارد: **مسیرِ رهگیری‌شده**
   (app/@modal/(.)coffee/[slug]). کلیک از داخل سایت به
   این شکاف می‌رسد و صفحهٔ زیرش سر جایش می‌ماند؛ بازدید
   سرد یا رفرش به صفحهٔ کامل می‌رود. همان دو رفتار، بی
   هیچ حالتِ دستی.

   بستن مودال یک قدم به عقب در تاریخچه است، پس دکمهٔ back
   مرورگر و دکمهٔ بستن دقیقاً یک کار می‌کنند — عیناً مثل
   نسخهٔ ویت.

   ── چرا داده به‌شکل نگاشت می‌آید، نه تابع ──
   این مودال در شکافِ layout ریشه رندر می‌شود، یعنی
   **بیرون** از ShopProvider ای که app/page.jsx می‌سازد.
   پس نمی‌تواند bySlug و grindLabel را از کانتکست بگیرد.

   می‌شد یک Provider دوم اینجا هم گذاشت، ولی آن‌وقت دو
   سبد جدا می‌داشتیم و افزودن از یکی روی دیگری اثر
   نمی‌کرد — دامی که بعداً پیدا کردنش سخت است. پس فقط
   همان دو چیزی که لازم است، به‌شکل دادهٔ ساده از سرور
   می‌آید.
   ══════════════════════════════════════════════════ */

export default function ItemModal({ item, beanNames = {}, grindLabels = {} }) {
  const router = useRouter();
  const close = useCallback(() => router.back(), [router]);

  if (!item) return null;

  return (
    <ItemDetail
      item={item}
      onClose={close}
      beanName={(slug) => beanNames[slug] || slug}
      grindLabel={(value) => grindLabels[value] || ''}
    />
  );
}
