'use client';

import { useEffect, useState, useMemo } from 'react';
import { useShop } from '../context/ShopContext.jsx';
import { GROUPS, GROUP_ORDER, isTracked, isSoldOut } from '../lib/groups.js';
import { formatWeight, money, toFa } from '../lib/format.js';
import { priceFor } from '@ghahve/shared/pricing.js';

export default function Hero() {
  const { byKind, addWeighed } = useShop();
  const coffees = byKind.coffee || [];

  const [slug, setSlug] = useState('');
  const [grams, setGrams] = useState(250);

  /* اولین قهوهٔ فهرست به‌طور خودکار انتخاب می‌شود، و اگر
     قهوهٔ انتخاب‌شده حذف شد دوباره اولی انتخاب می‌شود. */
  useEffect(() => {
    if (coffees.length === 0) return;
    if (!coffees.some((c) => c.slug === slug)) {
      const first = [...coffees].sort((a, b) => a.rank - b.rank)[0];
      setSlug(first.slug);
    }
  }, [coffees, slug]);

  const selected = useMemo(() => coffees.find((c) => c.slug === slug), [coffees, slug]);

  /* ترازو هم راهی برای افزودن به سبد است، پس باید همان
     قاعدهٔ موجودیِ کارت‌ها را رعایت کند — وگرنه مشتری
     اهرم را می‌کشد و خطا را تازه سر پرداخت می‌بیند. */
  const outOfStock = selected ? isSoldOut(selected) : false;
  const overStock = selected && isTracked(selected) && grams > selected.stock;

  return (
    <section className="hero">
      <img
        className="hero-photo"
        src="/img/hero-cafe.svg"
        alt="فضای کافه در نور صبح: پیشخوان، دستگاه اسپرسو و پنجرهٔ قوسی"
      />
      <div className="hero-scrim" aria-hidden="true"></div>

      <svg
        className="roast-curve"
        viewBox="0 0 800 260"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0,240 C140,238 210,150 300,110 S520,62 800,34"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M0,255 C140,252 210,180 300,145 S520,110 800,86"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 7"
          opacity=".5"
        />
      </svg>

      <div className="wrap hero-inner">
        <div className="hero-copy">
          <p className="eyebrow">رست‌شده در تهران · تاریخ رست روی هر بسته</p>
          <h1>
            قهوه را
            <br />
            <span className="hl">به اندازه</span> بخرید،
            <br />
            نه به بسته.
          </h1>
          <p className="lead">
            بیش از سی خاستگاه و میکس، هرکدام با پروفایل رست جداگانه. از ۱۰۰ گرم برای امتحان کردن تا
            ۲ کیلو برای کافه‌تان — وزن را خودتان انتخاب کنید، قیمت همان لحظه حساب می‌شود.
          </p>
          <div className="hero-cta">
            <a className="btn btn-primary" href="#products">
              دیدن قهوه‌ها
            </a>
            <a className="btn btn-ghost" href="#guide">
              کدام رست به من می‌خورد؟
            </a>
          </div>
          <ul className="hero-facts">
            <li>
              <b>{toFa(coffees.length)} قهوه</b>
              <span>روی میز، همین حالا</span>
            </li>
            <li>
              <b>۷۲ ساعت</b>
              <span>حداکثر فاصله رست تا ارسال</span>
            </li>
            <li>
              <b>تا ۱۵٪</b>
              <span>تخفیف خرید کیلویی</span>
            </li>
          </ul>
        </div>

        {/* امضای صفحه: ترازوی قیمت */}
        <aside className="scale" aria-label="محاسبه قیمت بر اساس وزن">
          <div className="scale-head">
            <span className="scale-title">ترازوی قیمت</span>
            <span className="scale-dot"></span>
          </div>

          <label className="field">
            <span className="field-label">قهوه را انتخاب کنید</span>
            <select className="select" value={slug} onChange={(e) => setSlug(e.target.value)}>
              {GROUP_ORDER.map((g) => {
                const list = coffees.filter((p) => p.group === g).sort((a, b) => a.rank - b.rank);
                if (!list.length) return null;
                return (
                  <optgroup key={g} label={GROUPS[g].label}>
                    {list.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.name} — {p.origin}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </label>

          <div className="readout">
            <div className="readout-weight">
              <span>{formatWeight(grams)}</span>
            </div>
            <div className="readout-price">
              <span>{toFa(selected ? priceFor(selected.price, grams) : 0)}</span>
              <em>تومان</em>
            </div>
            <div className="readout-unit">هر کیلو {money(selected?.price || 0)}</div>
          </div>

          <input
            type="range"
            className="range"
            min="100"
            max="2000"
            step="50"
            value={grams}
            onChange={(e) => setGrams(Number(e.target.value))}
            aria-label="وزن به گرم"
          />
          <div className="range-ticks" aria-hidden="true">
            <span>۱۰۰گ</span>
            <span>۵۰۰گ</span>
            <span>۱ک</span>
            <span>۱٫۵ک</span>
            <span>۲ک</span>
          </div>

          <button
            className="btn btn-primary btn-block"
            onClick={() => selected && addWeighed(selected.slug, grams)}
            disabled={!selected || outOfStock || overStock}
          >
            {outOfStock ? 'ناموجود' : 'افزودن به سبد'}
          </button>
          <p className="scale-note">
            {outOfStock
              ? 'این قهوه فعلاً موجود نیست — قهوهٔ دیگری انتخاب کنید.'
              : overStock
                ? `از این قهوه فقط ${toFa(selected.stock)} گرم مانده است.`
                : 'وزن‌ها پس از رست اندازه‌گیری می‌شود؛ خطای مجاز ±۳ گرم.'}
          </p>
        </aside>
      </div>
    </section>
  );
}
