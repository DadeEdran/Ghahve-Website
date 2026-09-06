'use client';

import { useState } from 'react';
import Header from './Header.jsx';
import CartDrawer from './CartDrawer.jsx';

/* ══════════════════════════════════════════════════
   هدر سایت، همراه با کشوی سبد.

   ── چرا یک لایهٔ اضافه ──
   Header یک تابع می‌خواهد (onOpenCart) و تابع از مرز
   سروری به مشتری رد نمی‌شود — فقط دادهٔ قابل‌سریال‌سازی
   رد می‌شود. پس صفحهٔ سروری نمی‌تواند خودش Header را
   با کنترلِ سبد رندر کند؛ این تکه باید مشتری باشد.

   همین یک جا صاحب حالتِ سبد است، پس هر صفحه‌ای که هدر
   دارد سبد هم دارد: صفحهٔ اصلی و صفحهٔ کالا هر دو از
   همین می‌آیند و رفتارشان یکی است.
   ══════════════════════════════════════════════════ */

export default function SiteHeader() {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <>
      <Header onOpenCart={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
