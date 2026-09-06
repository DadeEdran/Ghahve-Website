'use client';

import { useState } from 'react';
import { toFa } from '../lib/format.js';
import { isSoldOut } from '../lib/groups.js';

/* ══════════════════════════════════════════════════
   افزودن دانه به میکس.

   یک فهرست، دو حالت: اهرم‌های ساده و حالت تصویری هر دو
   همین را نشان می‌دهند تا قاعدهٔ «چه دانه‌ای می‌شود اضافه
   کرد» یک جا بماند.

   دانهٔ ناموجود از فهرست *حذف* نمی‌شود، خاموش می‌شود:
   نبودنش در فهرست این حس را می‌داد که دیگر این قهوه را
   نداریم، در حالی‌که فقط موقتاً تمام شده. option با صفت
   disabled هم با صفحه‌کلید رد می‌شود و هم صفحه‌خوان
   «در دسترس نیست» را می‌خواند.
   ══════════════════════════════════════════════════ */

export default function BeanPicker({ options, onPick }) {
  const [value, setValue] = useState('');

  if (!options.length) return null;

  return (
    <label className="mix-add">
      <span className="field-label">هر دانهٔ دیگری خواستید اضافه کنید</span>
      <select
        className="select"
        value={value}
        onChange={(e) => {
          onPick(e.target.value);
          setValue('');
        }}
      >
        <option value="">از میان {toFa(options.length)} قهوه انتخاب کنید…</option>
        {options.map((b) => {
          const out = isSoldOut(b);
          return (
            <option key={b.slug} value={b.slug} disabled={out}>
              {b.name} — {b.origin}
              {out ? ' (ناموجود)' : ''}
            </option>
          );
        })}
      </select>
    </label>
  );
}
