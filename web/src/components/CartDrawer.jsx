'use client';

import { useEffect, useRef, useState } from 'react';
import { useShop } from '../context/ShopContext.jsx';
import { api } from '../lib/api.js';
import { KINDS } from '../lib/groups.js';
import { formatWeight, money, toFa, toLatinDigits } from '../lib/format.js';
import { priceFor } from '@ghahve/shared/pricing.js';
import CardArt from './CardArt.jsx';
import PrintSheet from './PrintSheet.jsx';
import Receipt from './Receipt.jsx';

const EMPTY_FORM = { name: '', phone: '', address: '', note: '' };

export default function CartDrawer({ open, onClose }) {
  const {
    resolved,
    totals,
    cartSummary,
    nextTier,
    changeWeight,
    changeQty,
    removeLine,
    clearCart,
    setLineGrind,
    grindOptions,
    unitPrice,
    bySlug,
    toast,
    content
  } = useShop();

  /* دو حالت: فهرست سبد، و فرم اطلاعات گیرنده */
  const [step, setStep] = useState('cart');
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null);

  const closeBtn = useRef(null);
  const lastFocus = useRef(null);

  useEffect(() => {
    if (open) {
      lastFocus.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      closeBtn.current?.focus();
    } else {
      document.body.style.overflow = '';
      lastFocus.current?.focus?.();
      /* بعد از بسته شدن، فرم به حالت اول برمی‌گردد */
      setTimeout(() => {
        setStep('cart');
        setError('');
        setDone(null);
      }, 350);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const submit = async () => {
    setError('');

    /* شماره ممکن است با کیبورد فارسی وارد شود */
    const phone = toLatinDigits(form.phone).trim();

    if (!form.name.trim()) return setError('نام گیرنده را بنویسید');
    if (!/^0\d{10}$/.test(phone)) {
      return setError('شمارهٔ موبایل را کامل و با ۰ اول وارد کنید، مثل ۰۹۱۲۱۲۳۴۵۶۷');
    }
    if (form.address.trim().length < 10) return setError('نشانی را کامل‌تر بنویسید');

    setSending(true);
    try {
      const res = await api.placeOrder({
        /* نحوهٔ آسیاب و ترکیب میکس روی خودِ ردیف می‌روند —
           هر قهوه می‌تواند جور دیگری تحویل شود. */
        lines: resolved.map((l) =>
          l.kind === 'gear'
            ? { slug: l.slug, qty: l.qty }
            : {
                slug: l.slug,
                grams: l.grams,
                ...(l.item.grindable ? { grind: l.grind || 'whole' } : {}),
                ...(l.item.isBlend && l.mix?.length ? { mix: l.mix } : {})
              }
        ),
        customer: {
          name: form.name.trim(),
          phone,
          address: form.address.trim(),
          note: form.note.trim()
        }
      });

      setDone(res);
      clearCart();
      setForm(EMPTY_FORM);
      toast(`سفارش ${res.code} ثبت شد`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const field = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      <div className={`overlay ${open ? 'is-open' : ''}`.trim()} hidden={!open} onClick={onClose} />

      <aside
        className={`drawer ${open ? 'is-open' : ''}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawerTitle"
        hidden={!open}
      >
        <div className="drawer-head">
          <h2 id="drawerTitle">
            {done ? 'سفارش ثبت شد' : step === 'form' ? 'اطلاعات گیرنده' : 'سبد خرید'}
          </h2>
          <button className="btn-close" ref={closeBtn} onClick={onClose} aria-label="بستن سبد خرید">
            ×
          </button>
        </div>

        {/* ── رسید سفارش ── */}
        {done ? (
          <>
            <div className="drawer-body">
              <Receipt order={done} shop={content?.about} />
            </div>

            {/* همان رسید، این بار فرزند مستقیم body — تنها
                چیزی که چاپگر می‌بیند. دلیلش پای PrintSheet. */}
            <PrintSheet>
              <Receipt order={done} shop={content?.about} />
            </PrintSheet>

            <div className="drawer-foot">
              <button className="btn btn-primary btn-block" onClick={() => window.print()}>
                چاپ یا ذخیرهٔ رسید
              </button>
              <button className="btn btn-ghost btn-block btn-back" onClick={onClose}>
                بستن
              </button>
            </div>
          </>
        ) : step === 'form' ? (
          /* ── فرم اطلاعات گیرنده ── */
          <>
            <div className="drawer-body">
              <p className="form-lead">
                سفارش شما: <b>{cartSummary()}</b> — پرداختی <b>{money(totals.total)}</b>
              </p>

              <label className="field">
                <span className="field-label">نام و نام خانوادگی</span>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => field('name', e.target.value)}
                  placeholder="مثلاً مریم احمدی"
                />
              </label>

              <label className="field">
                <span className="field-label">شمارهٔ موبایل</span>
                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) => field('phone', e.target.value)}
                  placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                  inputMode="tel"
                />
              </label>

              <label className="field">
                <span className="field-label">نشانی کامل</span>
                <textarea
                  className="input"
                  rows="3"
                  value={form.address}
                  onChange={(e) => field('address', e.target.value)}
                  placeholder="شهر، خیابان، کوچه، پلاک و واحد"
                />
              </label>

              <label className="field">
                <span className="field-label">توضیح (اختیاری)</span>
                <textarea
                  className="input"
                  rows="2"
                  value={form.note}
                  onChange={(e) => field('note', e.target.value)}
                  placeholder="مثلاً بعد از ساعت ۵ تماس بگیرید"
                />
              </label>

              {error ? (
                <p className="form-error" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="drawer-foot">
              <button className="btn btn-primary btn-block" onClick={submit} disabled={sending}>
                {sending ? 'در حال ثبت…' : `ثبت نهایی — ${money(totals.total)}`}
              </button>
              <button
                className="btn btn-ghost btn-block btn-back"
                onClick={() => {
                  setStep('cart');
                  setError('');
                }}
              >
                بازگشت به سبد
              </button>
            </div>
          </>
        ) : (
          /* ── فهرست سبد ── */
          <>
            <div className="drawer-body">
              {resolved.length === 0 ? (
                <p className="cart-empty">
                  سبد خالی است.
                  <br />
                  از فهرست قهوه‌ها وزن دلخواه‌تان را انتخاب کنید یا سری به قفسهٔ ابزار بزنید.
                </p>
              ) : (
                resolved.map((l) => {
                  const meta = KINDS[l.kind] || KINDS.coffee;
                  const isGear = l.kind === 'gear';
                  /* قیمت میکس به نسبت دانه‌ها بستگی دارد، پس
                     قیمت هر کیلو برای هر ردیف جدا حساب می‌شود. */
                  const perKg = isGear ? l.item.price : unitPrice(l);

                  return (
                    <div className="cart-item" key={l.key}>
                      <div className="cart-item-top">
                        <span className="cart-thumb">
                          <CardArt item={l.item} slot="thumb" />
                        </span>
                        <div className="cart-item-info">
                          <h3>{l.item.name}</h3>
                          <span className="unit">
                            {isGear ? `هر عدد ${money(perKg)}` : `هر کیلو ${money(perKg)}`}
                          </span>
                        </div>
                        <span className="line-price">
                          {isGear ? money(l.item.price * l.qty) : money(priceFor(perKg, l.grams))}
                        </span>
                      </div>

                      {/* ترکیب میکس، همان‌طور که مشتری چیده است */}
                      {l.item.isBlend && l.mix?.length ? (
                        <ul className="cart-mix">
                          {l.mix.map((m) => (
                            <li key={m.slug}>
                              <span>{bySlug.get(m.slug)?.name || m.slug}</span>
                              <b>٪{toFa(m.percent)}</b>
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      <div className="qty">
                        <button
                          onClick={() =>
                            isGear ? changeQty(l.key, -1) : changeWeight(l.key, -meta.step)
                          }
                          aria-label={`کم کردن از ${l.item.name}`}
                        >
                          −
                        </button>
                        <output>{isGear ? `${toFa(l.qty)} عدد` : formatWeight(l.grams)}</output>
                        <button
                          onClick={() =>
                            isGear ? changeQty(l.key, 1) : changeWeight(l.key, meta.step)
                          }
                          aria-label={`اضافه کردن به ${l.item.name}`}
                        >
                          +
                        </button>
                        <button className="remove" onClick={() => removeLine(l.key)}>
                          حذف
                        </button>
                      </div>

                      {/* نحوهٔ تحویل، جدا برای همین ردیف */}
                      {l.item.grindable ? (
                        <label className="cart-grind">
                          <span className="field-label">تحویل این قهوه</span>
                          <select
                            className="select"
                            value={l.grind || 'whole'}
                            onChange={(e) => setLineGrind(l.key, e.target.value)}
                          >
                            {grindOptions.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>

            <div className="drawer-foot">
              <dl className="totals">
                <div>
                  <dt>مجموع سبد</dt>
                  <dd>{cartSummary()}</dd>
                </div>
                <div>
                  <dt>جمع کل</dt>
                  <dd>{money(totals.base)}</dd>
                </div>
                {totals.discount > 0 ? (
                  <div className="row-discount">
                    <dt>
                      تخفیف وزنی <span>{totals.discountLabel}</span>
                    </dt>
                    <dd>− {money(totals.discount)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>ارسال</dt>
                  <dd>
                    {totals.grams === 0
                      ? '—'
                      : totals.shipping === 0
                        ? 'رایگان'
                        : money(totals.shipping)}
                  </dd>
                </div>
                <div className="row-total">
                  <dt>پرداختی</dt>
                  <dd>{money(totals.total)}</dd>
                </div>
              </dl>

              {nextTier ? (
                <p className="next-tier">
                  {formatWeight(nextTier.min - totals.grams)} دیگر اضافه کنید تا تخفیف{' '}
                  {nextTier.label} فعال شود.
                </p>
              ) : null}

              <button
                className="btn btn-primary btn-block"
                onClick={() => {
                  if (resolved.length === 0)
                    return toast('اول چند قهوه یا ابزار به سبد اضافه کنید');
                  setStep('form');
                }}
              >
                ثبت سفارش
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
