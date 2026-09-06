'use client';

import { useState } from 'react';
import { KINDS } from '../../lib/groups.js';
import ItemCard from '../../components/ItemCard.jsx';

/* ══════════════════════════════════════════════════
   ستون خریدِ صفحهٔ کالا.

   همان کارت فروشگاه، با همان دکمهٔ افزودن — چون صفحه‌ای
   که فقط متن باشد بازدیدکنندهٔ گوگل را به بن‌بست می‌برد.

   وزن انتخابی حالتِ این کارت است و در صفحهٔ تک‌کالا فقط
   یک کارت هست، پس همین یک حالت کافی است. در نسخهٔ ویت
   هم دقیقاً همین‌جا و به همین شکل بود؛ فرق این است که
   آنجا داخل خودِ ItemPage می‌نشست و اینجا باید یک
   کامپوننت مشتریِ جدا باشد، چون صفحهٔ کالا سروری است.
   ══════════════════════════════════════════════════ */

export default function ItemBuyCard({ item }) {
  const [grams, setGrams] = useState(KINDS[item.kind]?.defaultWeight ?? 250);

  return <ItemCard item={item} grams={grams} onWeight={(_slug, w) => setGrams(w)} />;
}
