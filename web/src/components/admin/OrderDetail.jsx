'use client';

import { formatWeight, money, toFa } from '../../lib/format.js';

/* ══════════════════════════════════════════════════
   جزئیات کامل یک سفارش.

   هم صفحهٔ «سفارش‌ها» و هم پنجرهٔ «گزارش‌ها» از همین
   یک قطعه استفاده می‌کنند تا هیچ‌وقت یکی‌شان اطلاعاتی
   را نشان ندهد که آن یکی نمی‌دهد.

   مهم‌ترین بخش، ترکیب میکس است: مشتری می‌تواند نسبت
   دانه‌ها را خودش بچیند، و کارگاه باید بداند دقیقاً
   از هر دانه چند گرم بریزد.
   ══════════════════════════════════════════════════ */

export default function OrderDetail({ order }) {
  const o = order;
  const lines = o.lines || [];

  return (
    <div className="order-cols">
      <div>
        <h3>کالاهای این خرید</h3>

        <ul className="order-lines detail">
          {lines.map((l, i) => (
            <li key={i}>
              <span className="line-main">
                <b>{l.name}</b>
                <small className="mono">{l.slug}</small>

                {/* نحوهٔ تحویل همین ردیف */}
                {l.grindLabel ? <em className="line-tag">{l.grindLabel}</em> : null}

                {/* ترکیب میکس، با وزن هر دانه */}
                {l.mix?.length ? <MixBreakdown mix={l.mix} grams={l.grams} /> : null}
              </span>

              <span className="order-line-qty">
                {l.kind === 'gear' ? `${toFa(l.qty)} عدد` : formatWeight(l.grams)}
                <small>
                  {money(l.unitPrice)} {l.kind === 'gear' ? 'هر عدد' : 'هر کیلو'}
                </small>
              </span>

              <span className="order-line-price">{money(l.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <dl className="totals">
          <div>
            <dt>جمع کالا</dt>
            <dd>{money(o.totals?.base)}</dd>
          </div>
          {o.totals?.discount > 0 ? (
            <div className="row-discount">
              <dt>تخفیف وزنی {o.totals.discountLabel}</dt>
              <dd>− {money(o.totals.discount)}</dd>
            </div>
          ) : null}
          <div>
            <dt>ارسال</dt>
            <dd>{o.totals?.shipping === 0 ? 'رایگان' : money(o.totals?.shipping)}</dd>
          </div>
          <div className="row-total">
            <dt>پرداختی</dt>
            <dd>{money(o.totals?.total)}</dd>
          </div>
        </dl>
      </div>

      <div>
        <h3>گیرنده</h3>
        <p className="order-field">
          <b>نام:</b> {o.customer?.name}
        </p>
        <p className="order-field">
          <b>تلفن:</b>{' '}
          <span className="mono" dir="ltr">
            {o.customer?.phone}
          </span>
        </p>
        <p className="order-field">
          <b>نشانی:</b> {o.customer?.address}
        </p>
        {o.customer?.note ? (
          <p className="order-field">
            <b>توضیح مشتری:</b> {o.customer.note}
          </p>
        ) : null}

        <h3 className="mt">خلاصه</h3>
        <p className="order-field">
          <b>وزن کل:</b> {o.totals?.grams ? formatWeight(o.totals.grams) : '—'}
        </p>
        <p className="order-field">
          <b>تعداد قلم:</b> {o.totals?.pieces ? toFa(o.totals.pieces) : '—'}
        </p>
        <p className="order-field">
          <b>تعداد ردیف:</b> {toFa(lines.length)}
        </p>
      </div>
    </div>
  );
}

/* ترکیب میکس — نام دانه، درصد، و وزنی که باید توزین شود */
export function MixBreakdown({ mix, grams }) {
  return (
    <span className="mix-box">
      <em className="mix-title">ترکیب میکس</em>
      <span className="mix-list">
        {mix.map((m) => (
          <span className="mix-part" key={m.slug}>
            <span className="mix-name">{m.name || m.slug}</span>
            <b className="mix-pct">٪{toFa(m.percent)}</b>
            {grams ? (
              <small className="mix-grams">
                {formatWeight(Math.round((grams * m.percent) / 100))}
              </small>
            ) : null}
          </span>
        ))}
      </span>
    </span>
  );
}
