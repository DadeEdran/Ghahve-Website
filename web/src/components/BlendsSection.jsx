'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useShop } from '../context/ShopContext.jsx';
import { itemPath } from '@ghahve/shared/seo.js';
import { KINDS } from '../lib/groups.js';
import { money, toFa } from '../lib/format.js';
import { priceFor } from '@ghahve/shared/pricing.js';
import { useReveal } from '../lib/useReveal.js';
import CardArt from './CardArt.jsx';
import MixVisual from './MixVisual.jsx';
import BeanPicker from './BeanPicker.jsx';
import { startingMix, applyPercent, addBean, removeBean, mixError, sumOf } from '../lib/blend.js';

/* ══════════════════════════════════════════════════
   میکس‌های ویژهٔ خانه.

   هر میکس ترکیب پیشنهادی خودمان را دارد، و اگر مدیر
   اجازه داده باشد، مشتری می‌تواند نسبت‌ها را با اهرم‌ها
   جابه‌جا کند یا دانهٔ تازه‌ای از فهرست مجاز اضافه کند.
   قیمت همان لحظه از میانگین وزنیِ دانه‌ها حساب می‌شود.
   ══════════════════════════════════════════════════ */

const WEIGHTS = KINDS.coffee.weights;

function BlendCard({ item }) {
  const { byKind, bySlug, blendPrice, addWeighed, grind, grindOptions, toast } = useShop();

  const [mix, setMix] = useState(() => startingMix(item));
  const [grams, setGrams] = useState(KINDS.coffee.defaultWeight);
  const [pick, setPick] = useState(grind);

  /* حالت تصویری فقط یک نمای دیگر از همین حالت است: mix، grams و
     pick بالای هر دو می‌مانند، پس رفت‌وبرگشت بین دو حالت هیچ
     انتخابی را از دست نمی‌دهد. حالت ساده پیش‌فرض است. */
  const [visual, setVisual] = useState(false);

  const perKg = blendPrice(item, mix);
  const error = mixError(mix);
  const total = sumOf(mix);

  /* هر قهوه‌ای که خودش میکس نباشد می‌تواند وارد ترکیب شود —
     مشتری آزاد است، ترکیب ما فقط پیشنهاد است.

     دانهٔ ناموجود هم در فهرست می‌ماند ولی خاموش است (BeanPicker):
     برداشتنش از فهرست یعنی «این قهوه را دیگر نداریم»، در حالی‌که
     فقط تمام شده و برمی‌گردد. */
  const available = useMemo(
    () =>
      (byKind.coffee || [])
        .filter((b) => !b.isBlend && b.slug !== item.slug && !mix.some((p) => p.slug === b.slug))
        .sort((a, b) => a.name.localeCompare(b.name, 'fa')),
    [byKind, item.slug, mix]
  );

  const change = useCallback(
    (slug, value) => setMix((prev) => applyPercent(prev, slug, value)),
    []
  );

  const drop = useCallback(
    (slug) =>
      setMix((prev) => {
        const next = removeBean(prev, slug);
        if (next === prev) toast('میکس دست‌کم به دو دانه نیاز دارد');
        return next;
      }),
    [toast]
  );

  const join = useCallback((slug) => {
    if (!slug) return;
    setMix((prev) => addBean(prev, slug, 20));
  }, []);

  /* تنها راهِ رفتن به سبد — هر دو حالت همین را صدا می‌زنند،
     پس ردیفی که ساخته می‌شود مو به مو یکی است. */
  const add = useCallback(
    () => addWeighed(item.slug, grams, { grind: pick, mix }),
    [addWeighed, item.slug, grams, pick, mix]
  );

  const reset = () => {
    setMix(startingMix(item));
    toast('ترکیب به پیشنهاد ما برگشت');
  };

  /* آیا مشتری ترکیب را دست‌کاری کرده؟ */
  const changed = useMemo(() => {
    const base = startingMix(item);
    if (base.length !== mix.length) return true;
    return base.some((b) => mix.find((m) => m.slug === b.slug)?.percent !== b.percent);
  }, [item, mix]);

  return (
    <article className="blend-card" data-group={item.group}>
      <div className="blend-head">
        <span className="blend-art">
          <CardArt item={item} slot="blend" />
        </span>
        <div className="blend-title">
          <p className="card-origin">{item.origin}</p>
          <h3>{item.name}</h3>
          <p className="card-process">{item.spec}</p>
        </div>
        {item.tag ? <span className="badge">{item.tag}</span> : null}
      </div>

      <ul className="notes">
        {item.notes.map((n, i) => (
          <li key={i}>{n}</li>
        ))}
      </ul>

      {/* ── انتخاب حالت ──
            حالت ساده پیش‌فرض است؛ حالت تصویری همان ترکیب را
            با کیسه و دستگاه نشان می‌دهد و به همان‌جا می‌رسد.

            برچسب دکمه *کاری* را می‌گوید که انجام می‌دهد، پس
            aria-pressed اینجا گمراه‌کننده بود: صفحه‌خوان
            «حالت ساده، فشرده» می‌خواند که یعنی برعکس. */}
      <div className="mix-mode">
        <button
          type="button"
          className={`mix-mode-btn${visual ? ' is-on' : ''}`}
          onClick={() => setVisual((v) => !v)}
        >
          {visual ? 'حالت ساده' : 'خودم ترکیب کنم'}
        </button>
      </div>

      {visual ? (
        <MixVisual
          item={item}
          mix={mix}
          available={available}
          canEdit={Boolean(item.customizable)}
          onPercent={change}
          onDrop={drop}
          onJoin={join}
          onAdd={add}
          error={error}
        />
      ) : null}

      {/* ── اهرم‌های نسبت — حالت ساده ── */}
      {visual ? null : (
        <>
          <div className="mix-rows">
            {mix.map((p) => {
              const bean = bySlug.get(p.slug);

              return (
                <div className="mix-row" key={p.slug}>
                  <div className="mix-row-top">
                    <span className="mix-name">{bean?.name || p.slug}</span>
                    <span className="mix-val">٪{toFa(p.percent)}</span>
                  </div>

                  <div className="mix-row-bar">
                    <input
                      type="range"
                      className="range range-mix"
                      min="0"
                      max="100"
                      step="5"
                      value={p.percent}
                      disabled={!item.customizable}
                      onChange={(e) => change(p.slug, e.target.value)}
                      aria-label={`درصد ${bean?.name || p.slug}`}
                    />
                    {item.customizable && mix.length > 2 ? (
                      <button
                        type="button"
                        className="mix-drop"
                        onClick={() => drop(p.slug)}
                        aria-label={`برداشتن ${bean?.name || p.slug} از میکس`}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>

                  {bean ? (
                    <p className="mix-meta">
                      {bean.origin} · هر کیلو {money(bean.price)}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* ── افزودن دانه ── */}
          {item.customizable ? <BeanPicker options={available} onPick={join} /> : null}
        </>
      )}

      <div className="mix-sum">
        <span>مجموع</span>
        <b className={Math.abs(total - 100) > 1 ? 'is-off' : ''}>٪{toFa(total)}</b>
        {changed ? (
          <button type="button" className="mix-reset" onClick={reset}>
            بازگشت به پیشنهاد ما
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {/* ── وزن، آسیاب و افزودن ── */}
      <div className="weights" role="group" aria-label={`انتخاب وزن ${item.name}`}>
        {WEIGHTS.map((w) => (
          <button
            key={w}
            type="button"
            className={`weight-btn ${w === grams ? 'is-active' : ''}`.trim()}
            onClick={() => setGrams(w)}
          >
            {w === 1000 ? '۱ کیلو' : `${toFa(w)} گ`}
          </button>
        ))}
      </div>

      <label className="card-grind">
        <span className="field-label">چطور آسیاب شود؟</span>
        <select className="select" value={pick} onChange={(e) => setPick(e.target.value)}>
          {grindOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {/* دکمهٔ پاورقی در هر دو حالت سر جایش است: راه انداختن دستگاه
            یک خوشیِ اختیاری است، نه دروازهٔ خرید. دکمهٔ پایانِ مرحلهٔ ۴
            هم دقیقاً همین add را صدا می‌زند. */}
      <div className="card-foot">
        <span className="price">
          <b>{money(priceFor(perKg, grams))}</b>
          <small>هر کیلو {money(perKg)}</small>
        </span>
        <button type="button" className="btn btn-primary" disabled={Boolean(error)} onClick={add}>
          افزودن
        </button>
      </div>

      {/* مثل کارت‌های فروشگاه، از مورد ۲۷ به بعد آدرس دارد */}
      <Link className="card-more" href={itemPath(item)}>
        دربارهٔ این میکس
      </Link>
    </article>
  );
}

export default function BlendsSection() {
  const { houseBlends, content } = useShop();
  const c = content?.blends;

  useReveal([houseBlends]);

  if (!houseBlends.length) return null;

  return (
    <section className="section band" id="blends">
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow">{c?.eyebrow || 'ساختِ خودمان'}</p>
            <h2>{c?.title || 'میکس‌های ویژهٔ رُست‌خانه'}</h2>
          </div>
          {c?.lead ? <p className="section-desc">{c.lead}</p> : null}
        </div>

        {c?.customNote ? <p className="mix-note">{c.customNote}</p> : null}

        <div className="blend-grid">
          {houseBlends.map((b) => (
            <BlendCard item={b} key={b._id || b.slug} />
          ))}
        </div>
      </div>
    </section>
  );
}
