'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '../lib/api.js';
import { ORDER_STATUS } from '../lib/groups.js';
import { faDate, formatWeight, money, toFa, toLatinDigits } from '../lib/format.js';
import PrintSheet from './PrintSheet.jsx';
import Receipt from './Receipt.jsx';

/* ══════════════════════════════════════════════════
   پیگیری سفارش (مورد ۳۵ سند ضعف‌ها).

   مشتری حساب کاربری ندارد؛ بعد از بستن رسید هیچ راهی
   نداشت بفهمد سفارشش کجاست. اینجا با همان دو چیزی که
   دستش هست — شمارهٔ سفارش و شمارهٔ موبایلی که داده —
   وضعیت و محتوای سفارش را می‌بیند.

   سرور فقط وقتی چیزی می‌دهد که هر دو با هم جور باشند،
   و اگر جور نبودند همان یک پیام را می‌دهد؛ پس این صفحه
   هم نباید بین «کد نبود» و «شماره غلط بود» فرق بگذارد.

   ── چاپ ──
   مشتری‌ای که رسیدش را بسته، هیچ راه دیگری برای گرفتن
   یک نسخهٔ کاغذی نداشت. دکمهٔ چاپ اینجا همان برگه‌ای را
   می‌دهد که کشوی سبد می‌داد — همان کامپوننت Receipt و
   همان سبکِ چاپ، پس دو رسیدِ متفاوت به وجود نمی‌آید.
   آنچه روی صفحه دیده می‌شود دست نخورده است: نوار مرحله
   و وضعیت مالِ صفحه‌اند، برگهٔ چاپی جای خودش را دارد.
   ══════════════════════════════════════════════════ */

/* سه گام معمول سفارش. «لغو شده» گام نیست، پس جدا
   نشان داده می‌شود. کلیدها همان enum مدل Order اند. */
const STEPS = ['new', 'processing', 'done'];

function StatusBar({ status }) {
  if (status === 'canceled') {
    return (
      <p className="track-canceled" role="status">
        این سفارش لغو شده است. اگر فکر می‌کنید اشتباهی رخ داده، با ما تماس بگیرید.
      </p>
    );
  }

  const at = STEPS.indexOf(status);

  return (
    <ol className="track-steps" aria-label="مرحلهٔ سفارش">
      {STEPS.map((s, i) => (
        <li
          key={s}
          className={i < at ? 'is-past' : i === at ? 'is-now' : ''}
          aria-current={i === at ? 'step' : undefined}
        >
          <span className="track-dot" aria-hidden="true" />
          <span className="track-step-label">{ORDER_STATUS[s]}</span>
        </li>
      ))}
    </ol>
  );
}

export default function Track() {
  const params = useSearchParams();

  /* ── سئو ──
     تگ‌های <head> این صفحه — از جمله noindex — در
     app/track/page.jsx ساخته می‌شوند، یعنی روی سرور.
     دلیلِ noindex عوض نشده: این صفحه بدون جفتِ «کد +
     موبایل» چیزی برای نشان دادن ندارد، و آدرس‌های
     ?code=… هم نباید در نتایج جست‌وجو بنشینند.
     robots.txt همین را می‌گوید، ولی آن فقط خزیدن را
     می‌بندد نه ایندکس شدنِ آدرسی که از جای دیگری پیدا
     شده باشد. */

  /* اگر لینک با کد باز شده باشد (مثل /track?code=K7B2-4193)،
     مشتری فقط شماره‌اش را می‌نویسد. */
  const [code, setCode] = useState(params.get('code') || '');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  /* فقط برای بلوکِ تماسِ برگهٔ چاپی. نیامدنش نباید
     پیگیری را زمین بزند — همان قاعدهٔ ShopContext. */
  const [shop, setShop] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    /* هر دو ممکن است با کیبورد فارسی تایپ شده باشند —
       سرور هم همین کار را می‌کند، ولی اعتبارسنجی این
       طرف باید روی همان چیزی باشد که فرستاده می‌شود. */
    const c = toLatinDigits(code).trim();
    const p = toLatinDigits(phone).trim();

    if (!c) return setError('شمارهٔ سفارش را وارد کنید — روی رسید نوشته شده است');
    if (!/^0\d{10}$/.test(p.replace(/[\s-]/g, ''))) {
      return setError('شمارهٔ موبایل را کامل و با ۰ اول وارد کنید، مثل ۰۹۱۲۱۲۳۴۵۶۷');
    }

    setLoading(true);
    setOrder(null);
    try {
      const [found, texts] = await Promise.all([
        api.trackOrder(c, p),
        api.content().catch(() => null)
      ]);
      setOrder(found);
      setShop(texts?.about || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="site-header" id="top">
        <div className="wrap header-inner">
          <Link className="logo" href="/">
            <svg className="logo-mark" viewBox="0 0 40 40" aria-hidden="true">
              <path
                d="M20 6c6 0 9 4 9 9s-4 6-4 10a5 5 0 0 1-10 0c0-4-4-5-4-10s3-9 9-9Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path d="M20 8v20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M8 33h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="logo-text">
              رُست‌خانهٔ دانه<em>قهوهٔ تخصصی</em>
            </span>
          </Link>

          <div className="header-actions">
            <Link className="btn btn-ghost" href="/">
              بازگشت به فروشگاه
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="section">
          <div className="wrap track-wrap">
            <div className="section-head">
              <div>
                <p className="eyebrow">سفارش شما کجاست</p>
                <h2>پیگیری سفارش</h2>
              </div>
              <p className="section-desc">
                شمارهٔ سفارش روی رسید نوشته شده است. برای اینکه مطمئن شویم سفارش خودتان را می‌بینید،
                همان شمارهٔ موبایلی را هم بنویسید که موقع ثبت داده‌اید.
              </p>
            </div>

            <form className="track-form" onSubmit={submit}>
              <label className="field">
                <span className="field-label">شمارهٔ سفارش</span>
                <input
                  className="input"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="مثلاً K7B2-4193"
                  dir="ltr"
                  autoComplete="off"
                />
              </label>

              <label className="field">
                <span className="field-label">شمارهٔ موبایل</span>
                <input
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </label>

              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? 'در حال جست‌وجو…' : 'پیگیری سفارش'}
              </button>
            </form>

            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}

            {order ? (
              <div className="track-result">
                <div className="track-head">
                  <p className="order-code">
                    شمارهٔ سفارش: <b dir="ltr">{order.code}</b>
                  </p>
                  {order.createdAt ? (
                    <p className="receipt-date">ثبت‌شده در {faDate(order.createdAt)}</p>
                  ) : null}
                  <p
                    className={`track-status ${order.status === 'canceled' ? 'is-canceled' : ''}`.trim()}
                  >
                    وضعیت: <b>{ORDER_STATUS[order.status] || order.status}</b>
                  </p>
                </div>

                <StatusBar status={order.status} />

                <div className="receipt-sheet">
                  {order.customer?.name ? (
                    <p className="track-owner">به نام {order.customer.name}</p>
                  ) : null}

                  <h3 className="receipt-h">آنچه سفارش دادید</h3>

                  <ul className="receipt-lines">
                    {order.lines.map((l, i) => (
                      <li key={i}>
                        <div className="receipt-line-top">
                          <b>{l.name}</b>
                          <span className="receipt-line-price">{money(l.lineTotal)}</span>
                        </div>

                        <div className="receipt-line-meta">
                          <span>
                            {l.kind === 'gear' ? `${toFa(l.qty)} عدد` : formatWeight(l.grams)}
                          </span>
                          <span className="dot" aria-hidden="true">
                            ·
                          </span>
                          <span>
                            {money(l.unitPrice)} {l.kind === 'gear' ? 'هر عدد' : 'هر کیلو'}
                          </span>
                        </div>

                        {l.grindLabel ? (
                          <p className="receipt-grind">
                            نحوهٔ تحویل: <b>{l.grindLabel}</b>
                          </p>
                        ) : null}

                        {l.mix?.length ? (
                          <div className="receipt-mix">
                            <span className="receipt-mix-title">ترکیب میکس شما</span>
                            <ul>
                              {l.mix.map((m, j) => (
                                <li key={j}>
                                  <span>{m.name}</span>
                                  <b>٪{toFa(m.percent)}</b>
                                  {l.grams ? (
                                    <small>
                                      {formatWeight(Math.round((l.grams * m.percent) / 100))}
                                    </small>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>

                  <dl className="totals">
                    <div>
                      <dt>جمع کالا</dt>
                      <dd>{money(order.totals.base)}</dd>
                    </div>
                    {order.totals.discount > 0 ? (
                      <div className="row-discount">
                        <dt>تخفیف وزنی {order.totals.discountLabel}</dt>
                        <dd>− {money(order.totals.discount)}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>ارسال</dt>
                      <dd>
                        {order.totals.shipping === 0 ? 'رایگان' : money(order.totals.shipping)}
                      </dd>
                    </div>
                    <div className="row-total">
                      <dt>مبلغ قابل پرداخت</dt>
                      <dd>{money(order.totals.total)}</dd>
                    </div>
                  </dl>
                </div>

                <div className="track-actions">
                  <button className="btn btn-ghost" type="button" onClick={() => window.print()}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M7 9V4h10v5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5 9h14a2 2 0 0 1 2 2v5h-4v4H7v-4H3v-5a2 2 0 0 1 2-2Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinejoin="round"
                      />
                    </svg>
                    چاپ یا ذخیرهٔ رسید
                  </button>
                </div>

                {/* برگهٔ کاغذی: همان رسیدِ کشوی سبد، فرزند
                    مستقیم body. لینکِ «وضعیت سفارش را
                    ببینید» اینجا برداشته می‌شود — مشتری
                    همین حالا رویش ایستاده. */}
                <PrintSheet>
                  <Receipt
                    order={order}
                    shop={shop}
                    heading="رسید سفارش"
                    showMark={false}
                    statusLabel={ORDER_STATUS[order.status] || order.status}
                    showTracking={false}
                  />
                </PrintSheet>

                <p className="track-foot">
                  نشانی و توضیح‌های سفارش اینجا نشان داده نمی‌شوند. اگر لازم است چیزی را عوض کنید،
                  با شمارهٔ سفارش تماس بگیرید.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </>
  );
}
