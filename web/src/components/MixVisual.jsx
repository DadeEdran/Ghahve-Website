'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useShop } from '../context/ShopContext.jsx';
import { toFa } from '../lib/format.js';
import { mixSignature } from '../lib/cartLine.js';
import BeanPicker from './BeanPicker.jsx';
import { roastTone, mixTone, blendBagArt } from '../lib/art.js';
import {
  STAGES,
  STAGE_TITLE,
  SCENE,
  MIX_MS,
  SETTLE_MS,
  stageMessage,
  sackLayout,
  pourPlan,
  hopperLevel,
  prefersReducedMotion
} from '../lib/blendVisual.js';

/* ══════════════════════════════════════════════════
   حالت تصویری ساز میکس.

   این حالت *جایگزین* اهرم‌ها نیست، یک نمای دیگر از همان
   ترکیب است: همان آرایهٔ mix را می‌خواند و با همان
   applyPercent عوضش می‌کند. پس رفت‌وبرگشت بین دو حالت
   چیزی را از دست نمی‌دهد و در پایان، ردیف سبدِ هر دو راه
   مو به مو یکی است.

   چهار مرحله دارد و هیچ‌کدام خودبه‌خود جلو نمی‌رود مگر
   مشتری بخواهد:
     ۱ چیدن کیسه‌ها  ← درصدها همین‌جا تنظیم می‌شوند
     ۲ ریختن         ← کیسه‌ها یکی‌یکی خالی می‌شوند
     ۳ کار دستگاه    ← کوتاه، با امکان رد کردن
     ۴ بستهٔ آماده   ← و افزودن به سبد
   ══════════════════════════════════════════════════ */

/* نام دانه زیر کیسه جا محدود دارد؛ فهرست پایین نام کامل را دارد */
const shortName = (s = '') => (s.length > 11 ? s.slice(0, 10) + '…' : s);

export default function MixVisual({
  item,
  mix,
  available,
  canEdit,
  onPercent,
  onDrop,
  onJoin,
  onAdd,
  error
}) {
  const { bySlug } = useShop();

  const [stage, setStage] = useState('pick');
  const [poured, setPoured] = useState(0); // چند کیسه تا حالا خالی شده
  const addRef = useRef(null);

  /* شناسهٔ گرادیان و برش باید در کل صفحه یکتا باشد؛ چند میکس
     می‌توانند هم‌زمان صحنهٔ خودشان را باز کرده باشند. */
  const uid = useMemo(() => 'm' + String(item.slug).replace(/[^a-z0-9]/gi, ''), [item.slug]);

  /* دانه‌های ترکیب، همراه با رنگ رستشان از همان جدولی که
     تصویر کارت‌ها از آن رنگ می‌گیرد */
  const beans = useMemo(
    () =>
      mix.map((p) => {
        const bean = bySlug.get(p.slug);
        const meter = bean?.meter ?? 3;
        return {
          slug: p.slug,
          percent: p.percent,
          meter,
          name: bean?.name || p.slug,
          origin: bean?.origin || '',
          tone: roastTone(meter)
        };
      }),
    [mix, bySlug]
  );

  const plan = useMemo(() => pourPlan(beans), [beans]);
  const layout = useMemo(() => sackLayout(beans), [beans]);
  const signature = mixSignature(mix);

  /* اگر ترکیب عوض شود — چه با اهرم‌های همین‌جا، چه در حالت
     ساده و بازگشت به اینجا — آنچه دستگاه ساخته دیگر معتبر
     نیست؛ برمی‌گردیم سر مرحلهٔ اول.

     این کار حین رندر انجام می‌شود، نه در useEffect: با useEffect
     کاربر یک فریم بستهٔ *قبلی* را می‌دید و بعد پرش می‌خورد. */
  const [ranWith, setRanWith] = useState(signature);
  if (ranWith !== signature) {
    setRanWith(signature);
    setStage('pick');
    setPoured(0);
  }

  /* ── چه چیزی الان در حال ریختن است ──
     در مرحلهٔ ۲، کیسهٔ شمارهٔ `poured` وسط خالی شدن است. پس هم
     سطح قیف و هم رنگش باید *شاملِ* همان کیسه باشد و در طول همان
     ریختن به مقصد برسد؛ وگرنه قیف یک کیسه عقب می‌ماند. */
  const pouring = stage === 'pour' ? plan[poured] : null;
  const filled = poured + (pouring ? 1 : 0);

  const hopperTone = useMemo(() => mixTone(beans.slice(0, filled)), [beans, filled]);
  const level = hopperLevel(plan, filled);

  /* مدت همین ریختن: هم انیمیشن کیسه و هم بالا آمدن قیف با
     همین یک عدد کوک می‌شوند تا مو به مو هم‌زمان تمام شوند. */
  const span = pouring ? pouring.ms : 420;

  const bag = useMemo(
    () => blendBagArt({ slug: item.slug, name: item.name, parts: beans }),
    [item.slug, item.name, beans]
  );

  /* «حرکت کمتر» را یک بار در ابتدا می‌خوانیم و بعد به تغییرش
     گوش می‌دهیم — کاربر می‌تواند وسط کار در سیستم‌عامل عوضش کند. */
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const start = () => {
    if (error) return;
    /* بی‌حرکت یعنی بی‌انتظار: یک‌راست همان نتیجه */
    if (reduced) {
      setPoured(plan.length);
      setStage('done');
      return;
    }
    setPoured(0);
    setStage('pour');
  };

  const skip = () => {
    setPoured(plan.length);
    setStage(stage === 'pour' ? 'mix' : 'done');
  };

  const back = () => {
    setStage('pick');
    setPoured(0);
  };

  const restart = () => {
    if (reduced) {
      setPoured(plan.length);
      setStage('done');
      return;
    }
    setPoured(0);
    setStage('pour');
  };

  /* ── تنها موتور زمان‌بندی ──
     یک تایمر در هر لحظه، نه حلقهٔ فریم‌به‌فریم: جاوااسکریپت فقط
     مرزِ مرحله‌ها را می‌زند و حرکت بین دو مرز کارِ CSS است.
     پس روی گوشیِ میان‌رده هم چیزی برای دست‌وپا زدن نیست. */
  useEffect(() => {
    if (reduced) return undefined;

    if (stage === 'pour') {
      const cur = plan[poured];
      if (!cur) return undefined;
      const t = setTimeout(() => {
        const done = poured + 1;
        setPoured(done);
        if (done >= plan.length) setStage('mix');
      }, cur.ms);
      return () => clearTimeout(t);
    }

    if (stage === 'mix') {
      const t = setTimeout(() => setStage('done'), MIX_MS);
      return () => clearTimeout(t);
    }

    return undefined;
  }, [stage, poured, plan, reduced]);

  /* پایانِ مسیر جایی است که مشتری برایش آمده — وقتی بسته
     می‌رسد، تمرکز صفحه‌کلید هم همان‌جا می‌رود. */
  useEffect(() => {
    if (stage === 'done') addRef.current?.focus({ preventScroll: true });
  }, [stage]);

  const step = STAGES.indexOf(stage) + 1;

  return (
    <div
      className="mixv"
      data-stage={stage}
      style={{ '--pour': `${span}ms`, '--settle': `${SETTLE_MS}ms` }}
    >
      {/* مرحله‌ها: فقط شماره، و عنوانِ همان مرحله‌ای که در آنیم.
          چهار برچسب کنار هم در کارتِ ۳۳۰ پیکسلی بریده می‌شد.
          خواندنش با صفحه‌خوان از راه پیام زندهٔ پایین است. */}
      <div className="mixv-head" aria-hidden="true">
        <ol className="mixv-steps">
          {STAGES.map((s, i) => (
            <li
              key={s}
              className={`${i + 1 === step ? 'is-on' : ''}${i + 1 < step ? ' is-done' : ''}`}
            >
              <b>{toFa(i + 1)}</b>
            </li>
          ))}
        </ol>
        <p className="mixv-title">{STAGE_TITLE[stage]}</p>
      </div>

      <p className="sr-live" role="status" aria-live="polite">
        {stageMessage(stage, beans)}
      </p>

      {/* ── صحنه ──
          خودِ تصویر برای صفحه‌خوان یک عکس است با شرح کوتاه؛
          هر کاری که می‌شود کرد، دکمه و اهرمِ واقعیِ پایین است. */}
      <div className="mixv-stage">
        {stage === 'done' ? (
          <span className="mixv-bag" dangerouslySetInnerHTML={{ __html: bag }} />
        ) : (
          <svg
            className="mixv-scene"
            viewBox={`0 0 ${SCENE.w} ${SCENE.h}`}
            role="img"
            aria-label={`دستگاه ترکیب و ${toFa(layout.length)} کیسهٔ قهوه`}
          >
            <defs>
              <clipPath id={`hop${uid}`}>
                <path d="M30 26 H118 L88 66 H60 Z" />
              </clipPath>
            </defs>

            {/* زمین */}
            <path
              d={`M6 ${SCENE.floor} H${SCENE.w - 6}`}
              stroke="#DCCDB4"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* ── دستگاه ── */}
            <g className="machine">
              {/* قیف */}
              <path d="M30 26 H118 L88 66 H60 Z" fill="#2E241A" opacity=".18" />
              <g clipPath={`url(#hop${uid})`}>
                <rect
                  className="hopper-fill"
                  x="30"
                  y="26"
                  width="88"
                  height="40"
                  style={{ '--level': level, fill: hopperTone[1] }}
                />
              </g>
              <path
                d="M30 26 H118 L88 66 H60 Z"
                fill="none"
                stroke="#3D3833"
                strokeWidth="3"
                strokeLinejoin="round"
              />

              {/* بدنه */}
              <rect x="18" y="66" width="112" height="76" rx="12" fill="#3D3833" />
              <rect x="18" y="66" width="34" height="76" rx="12" fill="#FFFFFF" opacity=".07" />
              <rect x="22" y="132" width="104" height="6" rx="3" fill="#1E1710" opacity=".5" />

              {/* دریچهٔ دید و همزنِ داخلش */}
              <circle cx="70" cy="100" r="26" fill="#1E1710" />
              <circle cx="70" cy="100" r="26" fill="none" stroke="#6A625A" strokeWidth="3" />
              {/* همزن در مرکز دریچه می‌نشیند و از همان‌جا می‌چرخد؛
                  جای‌گیری‌اش با translate در CSS است تا مبدأ چرخش
                  همان مرکز بماند. */}
              <g className="tumbler" style={{ color: hopperTone[0] }}>
                <path d="M-17 0 H17" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                <path
                  d="M-9 -14 L9 14"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <path
                  d="M9 -14 L-9 14"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <circle r="4.5" fill="#EFE4D2" />
              </g>

              {/* چراغ کار */}
              <circle className="machine-lamp" cx="112" cy="76" r="4.5" fill="#B23A2B" />

              {/* دهانهٔ خروجی */}
              <path d="M52 142 h36 l-6 10 h-24Z" fill="#1E1710" />

              {/* خط‌های حرکت — فقط مرحلهٔ ۳ */}
              <g className="machine-lines" stroke="#6B5B45" strokeWidth="2.5" strokeLinecap="round">
                <path d="M136 88 h14" />
                <path d="M136 102 h20" />
                <path d="M136 116 h11" />
                <path d="M12 88 h-6" />
                <path d="M12 102 h-6" />
              </g>
            </g>

            {/* ── کیسه‌ها ── */}
            {layout.map((s, i) => {
              const bean = beans.find((b) => b.slug === s.slug) || beans[i];
              const done = i < poured;
              const pouring = stage === 'pour' && i === poured;

              return (
                <g
                  key={s.slug}
                  className={`sack${done ? ' is-empty' : ''}${pouring ? ' is-pouring' : ''}`}
                  style={{
                    '--x': `${s.x}px`,
                    '--y': `${s.y}px`,
                    '--s': s.scale,
                    '--hx': `${s.hx}px`,
                    '--hy': `${s.hy}px`,
                    /* زاویه از همان‌جایی می‌آید که hx و hy از آن آمده‌اند؛
                       اگر CSS عدد خودش را داشت، دهانه از قیف می‌افتاد. */
                    '--tilt': `${SCENE.tilt}deg`
                  }}
                >
                  <path
                    d="M-18 0 C-22 -13 -20 -30 -16 -38 L16 -38 C20 -30 22 -13 18 0 Z"
                    fill={bean.tone[0]}
                  />
                  <path
                    d="M0 0 C4 -13 3 -30 0 -38 L16 -38 C20 -30 22 -13 18 0 Z"
                    fill={bean.tone[1]}
                  />
                  <rect x="-17" y="-45" width="34" height="8" rx="4" fill={bean.tone[2]} />
                  <rect
                    x="-10"
                    y="-28"
                    width="20"
                    height="13"
                    rx="3"
                    fill="#FBF6EA"
                    opacity=".82"
                  />
                  <ellipse cy="-21" rx="5" ry="3.4" fill={bean.tone[1]} opacity=".75" />
                </g>
              );
            })}

            {/* ── جریان قهوه ──
                همهٔ کیسه‌ها روی یک نقطه خالی می‌شوند، پس یک جریانِ
                ثابت بس است: پنج دانه که پشت سر هم می‌افتند و
                نوبتشان با تأخیر جدا می‌شود.

                عمداً *بعد* از کیسه‌ها کشیده می‌شود: دهانهٔ کیسهٔ کج‌شده
                درست روی همین نقطه است و اگر زیرش می‌ماند، دانه‌ها
                پشت کیسه پنهان می‌شدند. */}
            <g className="stream" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <ellipse
                  key={i}
                  className="stream-bean"
                  cx={SCENE.hopper.x + (i % 2 ? 4 : -3)}
                  cy={SCENE.hopper.y - 2}
                  rx="3.5"
                  ry="2.5"
                  /* روشن‌ترین رنگِ همین ترکیب: دانه‌ها روی سطحِ تیرهٔ
                     داخل قیف می‌افتند و با رنگ تیره گم می‌شدند. */
                  style={{ '--i': i, fill: hopperTone[2] }}
                />
              ))}
            </g>

            {/* برچسب هر کیسه — بیرون از گروهِ متحرک می‌ماند تا
                موقع ریختن با کیسه بالا نرود */}
            {layout.map((s, i) => (
              <g key={`t${s.slug}`} className="sack-tag">
                <text x={s.x} y={SCENE.floor + 13} textAnchor="middle">
                  {shortName(beans.find((b) => b.slug === s.slug)?.name || s.slug)}
                </text>
                <text className="sack-pct" x={s.x} y={SCENE.floor + 24} textAnchor="middle">
                  ٪{toFa(s.percent)}
                </text>
                {i < poured ? (
                  <text className="sack-done" x={s.x} y={SCENE.floor - 26} textAnchor="middle">
                    ✓
                  </text>
                ) : null}
              </g>
            ))}
          </svg>
        )}
      </div>

      {/* ── دکمه‌های مرحله ── */}
      <div className="mixv-actions">
        {stage === 'pick' ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={Boolean(error)}
            onClick={start}
          >
            شروع ترکیب
          </button>
        ) : null}

        {stage === 'pour' || stage === 'mix' ? (
          <button type="button" className="btn btn-ghost" onClick={skip}>
            رد کردن نمایش
          </button>
        ) : null}

        {stage === 'done' ? (
          <button type="button" className="btn btn-primary mixv-add" ref={addRef} onClick={onAdd}>
            افزودن به سبد
          </button>
        ) : null}

        {stage !== 'pick' ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={back}>
              تنظیم دوباره
            </button>
            <button type="button" className="btn btn-ghost" onClick={restart}>
              از نو
            </button>
          </>
        ) : null}
      </div>

      {/* ── تنظیم درصدها: فقط مرحلهٔ ۱ ──
          همان اهرم و همان applyPercent حالت ساده. */}
      {stage === 'pick' ? (
        <>
          <ul className="mixv-beans">
            {beans.map((b) => (
              <li key={b.slug} style={{ '--tone': b.tone[1] }}>
                <div className="mixv-bean-top">
                  <span className="mixv-bean-name">
                    <i aria-hidden="true" />
                    {b.name}
                  </span>
                  <span className="mix-val">٪{toFa(b.percent)}</span>
                </div>
                <div className="mix-row-bar">
                  <input
                    type="range"
                    className="range range-mix"
                    min="0"
                    max="100"
                    step="5"
                    value={b.percent}
                    disabled={!canEdit}
                    onChange={(e) => onPercent(b.slug, e.target.value)}
                    aria-label={`درصد ${b.name}`}
                  />
                  {canEdit && mix.length > 2 ? (
                    <button
                      type="button"
                      className="mix-drop"
                      onClick={() => onDrop(b.slug)}
                      aria-label={`برداشتن ${b.name} از میکس`}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          {canEdit ? <BeanPicker options={available} onPick={onJoin} /> : null}
        </>
      ) : null}
    </div>
  );
}
