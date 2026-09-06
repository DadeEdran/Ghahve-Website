'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { itemPath } from '@ghahve/shared/seo.js';
import { KINDS, TASTES, isTracked, isSoldOut, stockText } from '../lib/groups.js';
import { money, toFa } from '../lib/format.js';
import { priceFor } from '@ghahve/shared/pricing.js';
import CardArt from './CardArt.jsx';
import ShareButton from './ShareButton.jsx';
import { hasStory } from './ItemBody.jsx';
import { useShop } from '../context/ShopContext.jsx';

/* ══════════════════════════════════════════════════
   کارت کالا — همان ساختار و کلاس‌های نسخهٔ اولیهٔ سایت.
   هر سه نوع کالا از همین کارت استفاده می‌کنند و فقط
   برچسب‌ها و واحدشان از جدول KINDS می‌آید.

   قهوه‌ها یک انتخاب اضافه دارند: نحوهٔ آسیاب. این انتخاب
   مال همین کارت است، پس می‌شود یک قهوه را اسپرسو و
   قهوهٔ بعدی را فرنچ‌پرس به سبد انداخت.
   ══════════════════════════════════════════════════ */

const CARD_CLASS = { coffee: 'card', gear: 'card card-gear', powder: 'card card-powder' };

export default function ItemCard({ item, grams, onWeight }) {
  const { addWeighed, addPiece, grind, grindOptions, blendPrice } = useShop();
  const pathname = usePathname();
  const kind = KINDS[item.kind] || KINDS.coffee;
  const group = kind.groups[item.group];

  /* آسیاب این کارت با پیش‌فرض سایت شروع می‌شود و اگر
     مشتری از بخش «روش دم‌آوری» پیش‌فرض را عوض کند،
     کارت‌هایی که دست نخورده‌اند هم همراهش می‌آیند. */
  const [pick, setPick] = useState(grind);
  const [touched, setTouched] = useState(false);

  /* در صفحهٔ اختصاصی همان کالا، دکمهٔ «دربارهٔ این قهوه»
     به خودش لینک می‌دهد — پس آنجا اصلاً نشانش نمی‌دهیم. */
  const onOwnPage = pathname === itemPath(item);

  useEffect(() => {
    if (!touched) setPick(grind);
  }, [grind, touched]);

  /* قیمت میکس از نسبت دانه‌هایش می‌آید، نه از قیمت خودش */
  const perKg = item.isBlend ? blendPrice(item, item.components) : item.price;

  /* ── موجودی ──
     حرف آخر را سرور می‌زند (رزرو اتمی هنگام ثبت سفارش)؛
     این‌ها فقط برای این‌اند که مشتری چیزی را به سبد نیندازد
     که همان لحظه هم نداریم. */
  const tracked = isTracked(item);
  const soldOut = isSoldOut(item);
  /* «کم مانده» وقتی حتی یک واحدِ پیش‌فرض هم موجود نیست،
     یا کمتر از یک بسته‌بندی معمول باقی مانده است */
  const low = tracked && !soldOut && item.stock < (kind.weighed ? 500 : 3);

  const bars = [1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= item.meter ? 'on' : ''} />);

  return (
    <article
      className={`${CARD_CLASS[item.kind] || 'card'}${soldOut ? ' is-soldout' : ''}`}
      data-group={item.group}
    >
      <div className="card-media">
        <CardArt item={item} />
        <span className="card-chip">{group?.short || ''}</span>
        {soldOut ? (
          <span className="badge badge-out">ناموجود</span>
        ) : item.tag ? (
          <span className="badge">{item.tag}</span>
        ) : null}
      </div>

      <div className="card-body">
        <div className="card-top">
          <div>
            <p className="card-origin">{item.origin}</p>
            {/* ── راهِ اصلی رسیدن به صفحهٔ کالا ──
                نامِ کالا لینک است، نه خودِ کارت. کارت پر از
                کنترل است (وزن، آسیاب، افزودن) و کلیکِ سرتاسری
                آن‌ها را می‌بلعد؛ نام هم همان چیزی است که کاربر
                طبیعتاً رویش کلیک می‌کند و هم یک <a href> واقعی
                به خزنده می‌دهد. */}
            <h3>
              {onOwnPage ? (
                item.name
              ) : (
                <Link className="card-title-link" href={itemPath(item)}>
                  {item.name}
                </Link>
              )}
            </h3>
            <p className="card-process">{item.spec}</p>
          </div>

          {/* ── فرستادن برای دوست ──
              جایش اینجاست و نه پای کارت: بالای کارت خالی
              است و هیچ‌کدام از کنترل‌های خرید — وزن،
              آسیاب، افزودن — نزدیکش نیست، پس نه دستِ
              مشتری را می‌گیرد نه اشتباهی زده می‌شود. */}
          <ShareButton item={item} className="card-share" />
        </div>

        <ul className="notes">
          {item.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>

        {/* برچسب‌های طعمی — همان‌هایی که بخش پیشنهاد طعم از آن‌ها می‌خواند */}
        {item.tastes?.length ? (
          <ul className="taste-tags" aria-label="پروفایل طعمی">
            {item.tastes.map((t) => (
              <li key={t}>{TASTES[t] || t}</li>
            ))}
          </ul>
        ) : null}

        <div className="roast-meter">
          <span>{kind.meterLabel}</span>
          <div
            className={`roast-bar ${kind.meterClass}`.trim()}
            role="img"
            aria-label={`${kind.meterLabel} ${toFa(item.meter)} از ۵`}
          >
            {bars}
          </div>
        </div>

        {kind.pairsLabel && item.pairs.length > 0 ? (
          <ul className="compat" aria-label={kind.pairsLabel}>
            <li className="compat-key">{kind.pairsLabel}</li>
            {item.pairs.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        ) : null}

        {/* لینک دوم، برای وقتی که واقعاً متنی برای خواندن هست.
            لینک است نه دکمه، چون آدرس دارد: کلیک راست →
            «کپی نشانی لینک» کار می‌کند.

            ── مودال، فعلاً نه ──
            در نسخهٔ ویت این لینک‌ها موقعیت فعلی را با
            state={{ backgroundLocation }} همراه خودشان
            می‌فرستادند تا به‌جای بارگذاری صفحهٔ کامل، همان
            مودال روی فروشگاه باز شود. در App Router این کار
            با مسیرهای «رهگیری‌شده» انجام می‌شود و در گام
            چهارم می‌آید. تا آن وقت کلیک، صفحهٔ اختصاصی کالا
            را باز می‌کند — همان چیزی که رفرش و بازدید سرد هم
            می‌دادند، پس چیزی از دست نمی‌رود جز راحتیِ نماندن
            روی فهرست.

            شرطِ hasStory فقط همین لینکِ فرعی را کنترل می‌کند،
            نه رسیدن به صفحهٔ کالا: آن کار با لینکِ نام انجام
            می‌شود که همیشه هست. وگرنه ابزار و پودر — که مدیر
            هنوز برایشان معرفی ننوشته — هیچ لینکی به صفحهٔ
            خودشان نداشتند و از دید گوگل یتیم می‌ماندند. */}
        {(hasStory(item) || item.isBlend) && !onOwnPage ? (
          <Link className="card-more" href={itemPath(item)}>
            دربارهٔ این {item.kind === 'coffee' ? 'قهوه' : 'کالا'}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.7" />
              <path d="M12 11v5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              <circle cx="12" cy="7.9" r="1.1" fill="currentColor" />
            </svg>
          </Link>
        ) : null}

        {kind.weighed ? (
          <div className="weights" role="group" aria-label={`انتخاب وزن ${item.name}`}>
            {kind.weights.map((w) => (
              <button
                key={w}
                type="button"
                className={`weight-btn ${w === grams ? 'is-active' : ''}`.trim()}
                onClick={() => onWeight(item.slug, w)}
                /* وزنی که موجود نیست اصلاً قابل انتخاب نباشد،
                     تا مشتری تا صفحهٔ پرداخت نرود و آنجا خطا نگیرد */
                disabled={tracked && w > item.stock}
              >
                {w === 1000 ? '۱ کیلو' : `${toFa(w)} گ`}
              </button>
            ))}
          </div>
        ) : null}

        {/* وضعیت انبار — فقط وقتی مدیر موجودی را شمرده باشد */}
        {soldOut ? (
          <p className="stock-note is-out" role="status">
            فعلاً موجود نیست — به‌زودی دوباره می‌رسد.
          </p>
        ) : low ? (
          <p className="stock-note is-low" role="status">
            فقط {stockText(item)} مانده است.
          </p>
        ) : null}

        {/* نحوهٔ آسیاب — فقط قهوه‌ها آسیاب می‌شوند */}
        {item.grindable ? (
          <label className="card-grind">
            <span className="field-label">چطور آسیاب شود؟</span>
            <select
              className="select"
              value={pick}
              onChange={(e) => {
                setPick(e.target.value);
                setTouched(true);
              }}
              aria-label={`نحوهٔ آسیاب ${item.name}`}
            >
              {grindOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="card-foot">
          <span className="price">
            <b>{kind.weighed ? money(priceFor(perKg, grams)) : money(item.price)}</b>
            <small>{kind.weighed ? `هر کیلو ${money(perKg)}` : kind.priceLabel}</small>
          </span>
          <button
            type="button"
            className="btn btn-primary"
            disabled={soldOut || (tracked && kind.weighed && grams > item.stock)}
            onClick={() =>
              kind.weighed
                ? addWeighed(item.slug, grams, { grind: item.grindable ? pick : '' })
                : addPiece(item.slug, 1)
            }
          >
            {soldOut ? 'ناموجود' : 'افزودن'}
          </button>
        </div>
      </div>
    </article>
  );
}
