import Link from 'next/link';
import { faDate, formatWeight, money, toFa, toLatinDigits } from '../lib/format.js';

/* ══════════════════════════════════════════════════
   رسید خرید — یک شکل، دو صداکننده.

   از روی پاسخ سرور ساخته می‌شود، نه از روی سبد — پس
   قیمت‌هایش همان چیزی است که واقعاً ثبت شده.

   مشتری اینجا باید سه چیز را ببیند: چه خریده (با ترکیب
   دقیق میکس)، چقدر باید بدهد، و چطور با ما تماس بگیرد.

   ── چرا از CartDrawer بیرون آمد ──
   دو جا همین برگه را چاپ می‌کنند: کشوی سبد بعد از ثبت
   سفارش، و صفحهٔ پیگیری برای کسی که رسیدش را بسته است.
   اگر دو نسخه می‌شد، روزی یکی «تخفیف وزنی» را نشان
   می‌داد و دیگری نه. پس یک کامپوننت، با چند پارامتر.

   ── دو شکلِ داده که هر دو باید کار کنند ──
   • پاسخ POST /api/orders — کاملِ کامل، با نشانی و تلفن.
   • پاسخ GET /api/orders/track — نمای عمومی، که عمداً
     نشانی و تلفن و توضیح را ندارد (server/src/lib/track.js).
   برای همین هر تکه‌ای که ممکن است نباشد، شرط دارد.
   ══════════════════════════════════════════════════ */

export default function Receipt({
  order,
  shop,
  /* عنوانِ بالای برگه: در کشو خبرِ ثبت است، در پیگیری
     فقط عنوانِ سند. */
  heading = 'سفارش شما ثبت شد',
  /* تیکِ سبز فقط وقتی معنی دارد که همین الان ثبت شده
     باشد — سفارشِ لغو‌شده تیک نمی‌خواهد. */
  showMark = true,
  /* وضعیت سفارش؛ فقط صفحهٔ پیگیری آن را می‌داند. */
  statusLabel = '',
  /* لینکِ «وضعیت سفارش را ببینید» — روی خودِ صفحهٔ
     پیگیری بی‌معنی است. */
  showTracking = true
}) {
  const lines = order.lines || [];
  const customer = order.customer || null;
  /* نمای عمومیِ پیگیری فقط نام دارد؛ بلوکِ «تحویل به»
     نباید برای یک نامِ تنها یک قاب خالی بسازد. */
  const hasDelivery = Boolean(customer?.phone || customer?.address);

  return (
    <div className="receipt">
      <div className="order-done">
        {showMark ? (
          <span className="order-done-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M5 12.5 10 17l9-10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ) : null}
        <h3>{heading}</h3>
        <p className="order-code">
          شمارهٔ سفارش: <b dir="ltr">{order.code}</b>
        </p>
        {order.createdAt ? <p className="receipt-date">{faDate(order.createdAt)}</p> : null}
        {statusLabel ? <p className="receipt-date">وضعیت: {statusLabel}</p> : null}
      </div>

      <div className="receipt-sheet">
        <h4 className="receipt-h">آنچه سفارش دادید</h4>

        <ul className="receipt-lines">
          {lines.map((l, i) => (
            <li key={i}>
              <div className="receipt-line-top">
                <b>{l.name}</b>
                <span className="receipt-line-price">{money(l.lineTotal)}</span>
              </div>

              <div className="receipt-line-meta">
                <span>{l.kind === 'gear' ? `${toFa(l.qty)} عدد` : formatWeight(l.grams)}</span>
                <span className="dot" aria-hidden="true">
                  ·
                </span>
                <span>
                  {money(l.unitPrice)} {l.kind === 'gear' ? 'هر عدد' : 'هر کیلو'}
                </span>
              </div>

              {/* نحوهٔ تحویل — مشتری باید ببیند چه انتخابی کرده */}
              {l.grindLabel ? (
                <p className="receipt-grind">
                  نحوهٔ تحویل: <b>{l.grindLabel}</b>
                </p>
              ) : null}

              {/* ترکیب میکس، دقیقاً همان‌طور که خودش چیده.
                  کلید شماره است نه slug: نمای عمومیِ پیگیری
                  فقط نام و درصد می‌دهد. */}
              {l.mix?.length ? (
                <div className="receipt-mix">
                  <span className="receipt-mix-title">ترکیب میکس شما</span>
                  <ul>
                    {l.mix.map((m, j) => (
                      <li key={j}>
                        <span>{m.name || m.slug}</span>
                        <b>٪{toFa(m.percent)}</b>
                        {l.grams ? (
                          <small>{formatWeight(Math.round((l.grams * m.percent) / 100))}</small>
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
            <dd>{order.totals.shipping === 0 ? 'رایگان' : money(order.totals.shipping)}</dd>
          </div>
          <div className="row-total">
            <dt>مبلغ قابل پرداخت</dt>
            <dd>{money(order.totals.total)}</dd>
          </div>
        </dl>

        {customer?.name ? (
          <div className="receipt-block">
            <h4 className="receipt-h">{hasDelivery ? 'تحویل به' : 'به نام'}</h4>
            <p>
              {customer.name}
              {customer.phone ? (
                <>
                  {' — '}
                  <span dir="ltr">{customer.phone}</span>
                </>
              ) : null}
            </p>
            {customer.address ? <p className="receipt-addr">{customer.address}</p> : null}
            {customer.note ? <p className="receipt-addr">توضیح شما: {customer.note}</p> : null}
          </div>
        ) : null}

        {/* راه تماس — از «دربارهٔ ما» خوانده می‌شود تا اگر
            مدیر شماره را عوض کرد، رسید هم به‌روز باشد. */}
        <div className="receipt-block receipt-contact">
          <h4 className="receipt-h">اگر سؤالی داشتید</h4>
          <p>
            همکاران ما برای هماهنگی ارسال با شما تماس می‌گیرند. شمارهٔ سفارش‌تان را دم دست داشته
            باشید.
          </p>
          {/* پیگیری سفارش — کد را با خودش می‌برد تا مشتری
              فقط شمارهٔ موبایلش را دوباره بنویسد */}
          {showTracking ? (
            <p className="receipt-contact-row">
              <span>پیگیری</span>
              <Link href={`/track?code=${encodeURIComponent(order.code)}`}>
                وضعیت سفارش را ببینید
              </Link>
            </p>
          ) : null}
          {shop?.phone ? (
            <p className="receipt-contact-row">
              <span>تلفن</span>
              <a href={`tel:${toLatinDigits(shop.phone).replace(/[^\d+]/g, '')}`} dir="ltr">
                {shop.phone}
              </a>
            </p>
          ) : null}
          {shop?.address ? (
            <p className="receipt-contact-row">
              <span>نشانی</span>
              <b>{shop.address}</b>
            </p>
          ) : null}
          {shop?.hours ? (
            <p className="receipt-contact-row">
              <span>ساعت کار</span>
              <b>{shop.hours}</b>
            </p>
          ) : null}
        </div>

        <p className="receipt-foot">این رسید را می‌توانید چاپ کنید یا از آن عکس بگیرید.</p>
      </div>
    </div>
  );
}
