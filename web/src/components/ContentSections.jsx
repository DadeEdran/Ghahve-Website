'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useShop } from '../context/ShopContext.jsx';
import { api } from '../lib/api.js';
import { TASTES, TASTE_ORDER, KINDS } from '../lib/groups.js';
import { toLatinDigits } from '../lib/format.js';
import { useReveal } from '../lib/useReveal.js';
import { isOptimizable } from '../lib/img.js';
import ItemCard from './ItemCard.jsx';

/* ══════════════════════════════════════════════════
   بخش‌هایی که متن‌شان از پنل مدیریت می‌آید.
   هر بخش اگر محتوایش نرسیده باشد اصلاً رندر نمی‌شود،
   تا سایت هیچ‌وقت با یک قاب خالی بالا نیاید.
   ══════════════════════════════════════════════════ */

/* شبکهٔ کارت کالا — وزن هر کارت را همین‌جا نگه می‌داریم،
   دقیقاً مثل بخش‌های فهرست. */
function CardGrid({ items }) {
  const [weights, setWeights] = useState({});
  const setWeight = (slug, w) => setWeights((prev) => ({ ...prev, [slug]: w }));

  return (
    <div className="grid-inner">
      {items.map((it) => (
        <ItemCard
          key={it._id || it.slug}
          item={it}
          grams={weights[it.slug] ?? (KINDS[it.kind]?.defaultWeight || 250)}
          onWeight={setWeight}
        />
      ))}
    </div>
  );
}

/* ══════════ ۱) چرا از ما بخرید ══════════ */

/* جدول آیکون‌ها — هر ردیف یک شکل */
// prettier-ignore
const ICONS = {
  calendar: <><rect x="4" y="5.5" width="16" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M4 10h16M9 3.5v4M15 3.5v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></>,
  scale:    <><path d="M12 4v16M7 20h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="M12 7 5 15h14L12 7Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></>,
  grinder:  <><path d="M7 4h10v5a5 5 0 0 1-10 0Z" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M9.5 14h5l1 6h-7Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></>,
  cup:      <><path d="M6 5h11v6a5.5 5.5 0 0 1-11 0Z" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M17 6.5h1.8a2.2 2.2 0 0 1 0 4.4H17M5 20h13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></>,
  leaf:     <><path d="M20 4c0 9-5.5 14-12 14H5c0-8 5.5-14 12-14Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M5 20c2-5 6-8 11-10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></>,
  chat:     <><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></>,
  bean:     <><ellipse cx="12" cy="12" rx="8" ry="6" fill="none" stroke="currentColor" strokeWidth="1.7" transform="rotate(-20 12 12)" /><path d="M6 13c3-4 6 3 11-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></>,
  truck:    <><path d="M3 7h11v9H3ZM14 10h4l3 3v3h-7Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><circle cx="7" cy="18" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.7" /><circle cx="17" cy="18" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.7" /></>
};

export function WhyUsSection() {
  const { content } = useShop();
  const c = content?.whyUs;

  useReveal([c]);

  if (!c || !Array.isArray(c.reasons) || c.reasons.length === 0) return null;

  return (
    <section className="section why" id="why">
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow">{c.eyebrow}</p>
            <h2>{c.title}</h2>
          </div>
          {c.lead ? <p className="section-desc">{c.lead}</p> : null}
        </div>

        <div className="why-grid">
          {c.reasons.map((r, i) => (
            <div className="why-card" key={i}>
              <span className="why-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">{ICONS[r.icon] || ICONS.bean}</svg>
              </span>
              <h3>{r.title}</h3>
              <p>{r.text}</p>
            </div>
          ))}
        </div>

        {c.ctaText ? (
          <div className="why-cta">
            <a className="btn btn-primary" href={c.ctaHref || '#products'}>
              {c.ctaText}
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ══════════ ۲) چه طعمی دوست دارید؟ ══════════ */

export function SuggestSection() {
  const { content, bySlug, byKind } = useShop();
  const c = content?.suggest;
  const profiles = Array.isArray(c?.profiles) ? c.profiles : [];

  const [active, setActive] = useState('');

  /* اولین پروفایل به‌طور خودکار باز می‌شود */
  useEffect(() => {
    if (profiles.length && !profiles.some((p) => p.key === active)) {
      setActive(profiles[0].key);
    }
  }, [profiles, active]);

  const current = profiles.find((p) => p.key === active);

  /* قهوه‌های پیشنهادی: اول همان‌هایی که مدیر انتخاب کرده،
     و اگر کم بودند، از روی برچسب طعمی خودِ قهوه‌ها پر می‌شود.
     این‌طوری با اضافه شدن قهوهٔ تازه، پیشنهادها هم زنده می‌مانند. */
  const picks = useMemo(() => {
    if (!current) return [];

    const chosen = (current.picks || []).map((s) => bySlug.get(s)).filter(Boolean);
    if (chosen.length >= 3) return chosen.slice(0, 6);

    const seen = new Set(chosen.map((i) => i.slug));
    const extra = (byKind.coffee || [])
      .filter((i) => !seen.has(i.slug) && (i.tastes || []).includes(current.key))
      .sort((a, b) => a.rank - b.rank);

    return [...chosen, ...extra].slice(0, 6);
  }, [current, bySlug, byKind]);

  useReveal([picks]);

  if (!c || profiles.length === 0) return null;

  return (
    <section className="section soft" id="suggest">
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow">{c.eyebrow}</p>
            <h2>{c.title}</h2>
          </div>
          {c.lead ? <p className="section-desc">{c.lead}</p> : null}
        </div>

        <div className="taste-picker" role="group" aria-label="انتخاب پروفایل طعمی">
          {profiles.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`taste-chip ${p.key === active ? 'is-active' : ''}`.trim()}
              onClick={() => setActive(p.key)}
            >
              <b>{p.label || TASTES[p.key] || p.key}</b>
              {p.hint ? <span>{p.hint}</span> : null}
            </button>
          ))}
        </div>

        {current ? (
          <>
            {current.advice ? (
              <div className="taste-advice">
                <h3>اگر {current.label} دوست دارید…</h3>
                <p>{current.advice}</p>
              </div>
            ) : null}

            {picks.length ? (
              <CardGrid items={picks} />
            ) : (
              <p className="empty">برای این سلیقه هنوز قهوه‌ای علامت نخورده است.</p>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}

/* ══════════ ۳) پیشنهاد روز و پرفروش‌ها ══════════ */

/* پیشنهاد روز هر روز عوض می‌شود، ولی در طول یک روز
   ثابت می‌ماند — تا اگر مشتری صفحه را دوباره باز کرد
   همان چیزی را ببیند که صبح دیده بود. */
const dayIndex = () => Math.floor(Date.now() / 86400000);

export function PicksSections() {
  const { content, items } = useShop();
  const c = content?.picks;

  const [featured, setFeatured] = useState([]);
  const [top, setTop] = useState([]);
  const [ready, setReady] = useState(false);

  /* با هر بار تازه شدن فهرست کالاها این دو هم دوباره خوانده
     می‌شوند — وگرنه کالایی که مدیر همین حالا پنهانش کرده
     تا بارگذاری بعدی صفحه اینجا می‌ماند. */
  useEffect(() => {
    let alive = true;
    Promise.all([api.featured(12).catch(() => []), api.topSellers(8).catch(() => [])]).then(
      ([f, t]) => {
        if (!alive) return;
        setFeatured(Array.isArray(f) ? f : []);
        setTop(Array.isArray(t) ? t : []);
        setReady(true);
      }
    );
    return () => {
      alive = false;
    };
  }, [items]);

  const daily = featured.length ? featured[dayIndex() % featured.length] : null;
  const rest = daily ? featured.filter((f) => f.slug !== daily.slug).slice(0, 3) : [];

  useReveal([featured, top]);

  if (!c || !ready) return null;

  return (
    <>
      {/* ── پیشنهاد روز ── */}
      {daily ? (
        <section className="section" id="daily">
          <div className="wrap">
            <div className="section-head">
              <div>
                <p className="eyebrow">{c.eyebrow}</p>
                <h2>{c.title}</h2>
              </div>
              {c.lead ? <p className="section-desc">{c.lead}</p> : null}
            </div>

            <div className="pick-head">
              <h3>{c.featuredTitle}</h3>
              {c.featuredNote ? <p>{c.featuredNote}</p> : null}
            </div>

            <div className="daily-wrap">
              <span className="daily-flag">پیشنهاد امروز</span>
              <CardGrid items={[daily]} />
            </div>

            {rest.length ? (
              <>
                <div className="pick-head pick-head-sub">
                  <h3>باقی انتخاب‌های ما</h3>
                </div>
                <CardGrid items={rest} />
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ── پرفروش‌ها ──
          شناسه‌اش «top» نیست: هدر سایت خودش id="top" دارد
          و لنگر لوگو به آن اشاره می‌کند. */}
      <section className="section soft" id="bestsellers">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">بر پایهٔ سفارش‌های واقعی</p>
              <h2>{c.topTitle}</h2>
            </div>
            {c.topNote ? <p className="section-desc">{c.topNote}</p> : null}
          </div>

          {top.length ? <CardGrid items={top} /> : <p className="empty">{c.emptyTop}</p>}
        </div>
      </section>
    </>
  );
}

/* ══════════ ۴) باشگاه مشتریان ══════════ */

const EMPTY = { name: '', phone: '', email: '', taste: '' };

export function ClubSection() {
  const { content } = useShop();
  const c = content?.club;

  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null);

  const field = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useReveal([c]);

  if (!c) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    const phone = toLatinDigits(form.phone).trim();
    if (form.name.trim().length < 2) return setError('نام‌تان را بنویسید');
    if (!/^0\d{10}$/.test(phone)) {
      return setError('شمارهٔ موبایل را کامل و با ۰ اول وارد کنید، مثل ۰۹۱۲۱۲۳۴۵۶۷');
    }
    if (form.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      return setError('ایمیل را درست وارد کنید یا خالی بگذارید');
    }

    setSending(true);
    try {
      const res = await api.joinClub({
        name: form.name.trim(),
        phone,
        email: form.email.trim(),
        taste: form.taste
      });
      setDone(res);
      setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="section club" id="club">
      <div className="wrap club-inner">
        <div className="club-copy">
          <p className="eyebrow">{c.eyebrow}</p>
          <h2>{c.title}</h2>
          {c.lead ? <p className="lead">{c.lead}</p> : null}

          {Array.isArray(c.benefits) && c.benefits.length ? (
            <ul className="check">
              {c.benefits.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="club-form">
          {done ? (
            <div className="club-done">
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
              <h3>{done.already ? 'اطلاعات‌تان به‌روز شد' : c.successTitle}</h3>
              <p>
                {done.already ? 'شما از قبل عضو باشگاه بودید — شماره‌تان همان است.' : c.successText}
              </p>
              <button className="btn btn-ghost" onClick={() => setDone(null)}>
                ثبت یک عضو دیگر
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
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

              {c.askEmail ? (
                <label className="field">
                  <span className="field-label">
                    ایمیل <em>(اختیاری)</em>
                  </span>
                  <input
                    className="input"
                    type="email"
                    value={form.email}
                    onChange={(e) => field('email', e.target.value)}
                    placeholder="name@mail.com"
                  />
                </label>
              ) : null}

              {c.askTaste ? (
                <label className="field">
                  <span className="field-label">
                    چه طعمی دوست دارید؟ <em>(اختیاری)</em>
                  </span>
                  <select
                    className="select"
                    value={form.taste}
                    onChange={(e) => field('taste', e.target.value)}
                  >
                    <option value="">فرقی نمی‌کند</option>
                    {TASTE_ORDER.map((t) => (
                      <option key={t} value={t}>
                        {TASTES[t]}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {error ? (
                <p className="form-error" role="alert">
                  {error}
                </p>
              ) : null}

              <button className="btn btn-primary btn-block" disabled={sending}>
                {sending ? 'در حال ثبت…' : 'عضو باشگاه می‌شوم'}
              </button>

              <p className="club-note">
                شماره‌تان فقط برای خبرها و پیشنهادهای خودمان استفاده می‌شود.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

/* ══════════ ۵) دربارهٔ ما ══════════ */

/* ══════════════════════════════════════════════════
   عکس کارگاه.

   آدرسش را مدیر در پنل دستی می‌نویسد، پس هر سه حالت
   ممکن است: پیش‌فرضِ برداریِ /img/roastery.svg، عکسی که
   خودش در «کالاها» آپلود کرده، یا آدرسی از یک دامنهٔ
   دیگر. فقط حالت وسط از بهینه‌ساز رد می‌شود — قاعده‌اش
   در lib/img.js است.

   قاب در .about-top ستون ۰.۸fr از عرض .wrap است: روی
   دسکتاپ حدود ۴۰۰ پیکسل، روی موبایل تمام عرض. lazy
   می‌ماند چون «دربارهٔ ما» همیشه پایین‌تر از تاست.
   ══════════════════════════════════════════════════ */
function AboutPhoto({ src, alt }) {
  if (!isOptimizable(src)) {
    return <img src={src} alt={alt} loading="lazy" />;
  }

  return (
    <Image src={src} alt={alt} width={480} height={360} sizes="(min-width: 960px) 34vw, 92vw" />
  );
}

export function AboutSection() {
  const { content } = useShop();
  const c = content?.about;

  useReveal([c]);

  if (!c) return null;

  return (
    <section className="section about" id="about">
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow">{c.eyebrow}</p>
            <h2>{c.title}</h2>
          </div>
          {c.lead ? <p className="section-desc">{c.lead}</p> : null}
        </div>

        <div className="about-top">
          {c.image ? (
            <figure className="about-photo">
              <AboutPhoto src={c.image} alt={c.imageCaption || 'کارگاه رست'} />
              {c.imageCaption ? <figcaption>{c.imageCaption}</figcaption> : null}
            </figure>
          ) : null}

          {Array.isArray(c.facts) && c.facts.length ? (
            <ul className="about-facts">
              {c.facts.map((f, i) => (
                <li key={i}>
                  <b>{f.value}</b>
                  <span>{f.label}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {Array.isArray(c.sections) && c.sections.length ? (
          <div className="about-grid">
            {c.sections.map((s, i) => (
              <article className="about-card" key={i}>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        ) : null}

        {c.address || c.phone || c.email ? (
          <div className="about-visit">
            <h3>{c.addressTitle || 'سری به کارگاه بزنید'}</h3>
            <ul>
              {c.address ? (
                <li>
                  <span>نشانی</span>
                  <b>{c.address}</b>
                </li>
              ) : null}
              {c.hours ? (
                <li>
                  <span>ساعت کار</span>
                  <b>{c.hours}</b>
                </li>
              ) : null}
              {c.phone ? (
                <li>
                  <span>تلفن</span>
                  <b>
                    <a href={`tel:${toLatinDigits(c.phone)}`}>{c.phone}</a>
                  </b>
                </li>
              ) : null}
              {c.email ? (
                <li>
                  <span>ایمیل</span>
                  <b>
                    <a href={`mailto:${c.email}`}>{c.email}</a>
                  </b>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
