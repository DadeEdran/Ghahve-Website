'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api.js';
import {
  KINDS,
  KIND_ORDER,
  GEAR_SHAPES,
  GEAR_MATERIALS,
  POWDER_SHAPES,
  POWDER_TONES,
  TASTES,
  TASTE_ORDER
} from '../../lib/groups.js';
import { money, toFa, toLatinDigits } from '../../lib/format.js';
import ItemCard from '../../components/ItemCard.jsx';
import { useStorefrontRefresh } from '../../lib/useStorefrontRefresh.js';

/* ══════════════════════════════════════════════════
   فرم افزودن و ویرایش کالا.
   کنار فرم، پیش‌نمایش زندهٔ همان کارتی که در سایت
   دیده می‌شود نمایش داده می‌شود.
   ══════════════════════════════════════════════════ */

const BLANK = {
  kind: 'coffee',
  slug: '',
  name: '',
  origin: '',
  spec: '',
  group: '',
  meter: 3,
  price: '',
  stock: '', // خالی یعنی نامحدود
  notes: '',
  pairs: '',
  tag: '',
  shape: '',
  mat: 'steel',
  tone: 'cocoa',
  zoom: 1,
  image: '',
  rank: 100,
  active: true,

  /* معرفی کامل — پنجرهٔ «دربارهٔ این قهوه» */
  story: '',
  taste: '',
  recommend: '',
  tastes: [],

  /* میکس */
  isBlend: false,
  house: false,
  customizable: false,
  components: [],
  pool: [],
  surcharge: '',

  /* ویترین */
  featured: false,
  pinnedTop: false,
  excludeTop: false
};

/* ساخت پیشنهاد شناسه از روی نام — فقط برای راحتی مدیر */
function suggestSlug(name) {
  /* جدول نگاشت — هر سطر یک نوع کالا */
  // prettier-ignore
  const map = {
    'ا':'a','آ':'a','ب':'b','پ':'p','ت':'t','ث':'s','ج':'j','چ':'ch','ح':'h','خ':'kh',
    'د':'d','ذ':'z','ر':'r','ز':'z','ژ':'zh','س':'s','ش':'sh','ص':'s','ض':'z','ط':'t',
    'ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'gh','ک':'k','گ':'g','ل':'l','م':'m','ن':'n',
    'و':'v','ه':'h','ی':'y',' ':'-','‌':'-'
  };
  return [...String(name).toLowerCase()]
    .map((ch) => (/[a-z0-9]/.test(ch) ? ch : (map[ch] ?? '')))
    .join('')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export default function AdminItemForm() {
  const { id } = useParams();
  const params = useSearchParams();
  const router = useRouter();
  const reloadShop = useStorefrontRefresh();
  const isNew = !id;

  const [form, setForm] = useState(() => ({
    ...BLANK,
    kind: KINDS[params.get('kind')] ? params.get('kind') : 'coffee'
  }));
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const fileRef = useRef(null);

  /* فهرست دانه‌های قابل استفاده در میکس.
     از مسیر مدیریتی خوانده می‌شود تا قهوه‌های خاموش هم
     دیده شوند — مدیر ممکن است دانه‌ای را موقتاً از سایت
     برداشته باشد ولی هنوز در میکس داشته باشد. */
  const [beans, setBeans] = useState([]);

  useEffect(() => {
    let alive = true;
    api
      .adminItems({ kind: 'coffee' })
      .then((list) => {
        if (!alive) return;
        /* یک میکس نمی‌تواند جزء میکس دیگری باشد */
        setBeans((Array.isArray(list) ? list : []).filter((b) => !b.isBlend));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  /* دستهٔ پیش‌فرض هنگام عوض شدن نوع کالا */
  useEffect(() => {
    const meta = KINDS[form.kind];
    if (!meta) return;
    if (!meta.groups[form.group]) {
      setForm((f) => ({
        ...f,
        group: meta.order[0],
        shape: f.kind === 'gear' ? 'dripper' : f.kind === 'powder' ? 'scoop' : ''
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.kind]);

  /* خواندن کالا برای ویرایش */
  useEffect(() => {
    if (isNew) return;
    let alive = true;

    (async () => {
      try {
        const item = await api.adminItem(id);
        if (!alive) return;
        setForm({
          ...BLANK,
          ...item,
          notes: (item.notes || []).join('\n'),
          pairs: (item.pairs || []).join('\n'),
          /* null در پایگاه داده = کادر خالی در فرم = نامحدود.
             صفر باید صفر بماند، پس ?? و نه || */
          stock: item.stock ?? '',
          mat: item.mat || 'steel',
          tone: item.tone || 'cocoa',
          tastes: Array.isArray(item.tastes) ? item.tastes : [],
          pool: [],
          components: Array.isArray(item.components)
            ? item.components.map((c) => ({ slug: c.slug, percent: c.percent }))
            : [],
          surcharge: item.surcharge || ''
        });
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id, isNew]);

  const meta = KINDS[form.kind] || KINDS.coffee;
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const onName = (value) => {
    setForm((f) => ({
      ...f,
      name: value,
      slug: slugTouched ? f.slug : suggestSlug(value)
    }));
  };

  /* ── ویرایش اجزای میکس ── */

  const componentSum = form.components.reduce((s, c) => s + (Number(c.percent) || 0), 0);

  /* دانه‌هایی که هنوز در میکس نیامده‌اند */
  const freeBeans = beans.filter(
    (b) => b.slug !== form.slug && !form.components.some((c) => c.slug === b.slug)
  );

  const setComponent = (i, key, value) =>
    setForm((f) => ({
      ...f,
      components: f.components.map((c, idx) => (idx === i ? { ...c, [key]: value } : c))
    }));

  const addComponent = () => {
    const next = freeBeans[0];
    if (!next) return;
    setForm((f) => ({
      ...f,
      components: [...f.components, { slug: next.slug, percent: 0 }]
    }));
  };

  const removeComponent = (i) =>
    setForm((f) => ({ ...f, components: f.components.filter((_, idx) => idx !== i) }));

  const toggleTaste = (key) =>
    setForm((f) => ({
      ...f,
      tastes: f.tastes.includes(key) ? f.tastes.filter((t) => t !== key) : [...f.tastes, key]
    }));

  /* کالای موقتی برای پیش‌نمایش کارت */
  const preview = useMemo(
    () => ({
      _id: 'preview',
      kind: form.kind,
      slug: form.slug || 'preview',
      name: form.name || 'نام کالا',
      origin: form.origin || 'خاستگاه',
      spec: form.spec || 'مشخصات',
      group: meta.groups[form.group] ? form.group : meta.order[0],
      meter: Number(form.meter) || 3,
      price: Number(toLatinDigits(form.price)) || 0,
      /* تا پیش‌نمایش، کارتِ ناموجود را هم همان‌طور نشان دهد */
      stock:
        toLatinDigits(form.stock).trim() === '' ? null : Number(toLatinDigits(form.stock)) || 0,
      notes: String(form.notes)
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      pairs: String(form.pairs)
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      tag: form.tag,
      shape: form.shape,
      mat: form.mat,
      tone: form.tone,
      zoom: Number(form.zoom) || 1,
      image: form.image,

      /* تا پیش‌نمایش دقیقاً مثل سایت رفتار کند */
      story: form.story,
      taste: form.taste,
      recommend: form.recommend,
      tastes: form.tastes,
      grindable: form.kind === 'coffee',
      isBlend: form.kind === 'coffee' && form.isBlend,
      customizable: form.customizable,
      components: form.components.map((c) => ({ ...c, percent: Number(c.percent) || 0 })),
      surcharge: Number(toLatinDigits(form.surcharge)) || 0
    }),
    [form, meta]
  );

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { url } = await api.uploadImage(file);
      set('image', url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');

    const price = Number(toLatinDigits(form.price));
    if (!form.name.trim()) return setError('نام کالا را بنویسید');
    if (!form.slug.trim()) return setError('شناسهٔ انگلیسی را بنویسید');
    if (!Number.isFinite(price) || price <= 0)
      return setError('قیمت را به تومان و بزرگ‌تر از صفر وارد کنید');

    /* موجودی: کادر خالی یعنی نامحدود (null)، نه صفر */
    const stockRaw = toLatinDigits(form.stock).trim();
    const stock = stockRaw === '' ? null : Math.round(Number(stockRaw));
    if (stock !== null && (!Number.isFinite(stock) || stock < 0)) {
      return setError('موجودی باید عددی مثبت باشد، یا خالی بماند برای نامحدود');
    }

    const payload = {
      kind: form.kind,
      slug: form.slug.trim().toLowerCase(),
      name: form.name.trim(),
      origin: form.origin.trim(),
      spec: form.spec.trim(),
      group: form.group,
      meter: Number(form.meter),
      price,
      stock,
      notes: form.notes,
      pairs: form.kind === 'coffee' ? '' : form.pairs,
      tag: form.tag.trim(),
      shape: form.shape,
      mat: form.mat,
      tone: form.tone,
      zoom: Number(form.zoom) || 1,
      image: form.image,
      rank: Number(toLatinDigits(form.rank)) || 100,
      active: form.active,

      /* معرفی کامل */
      story: form.story.trim(),
      taste: form.taste.trim(),
      recommend: form.recommend.trim(),
      tastes: form.kind === 'coffee' ? form.tastes : [],

      /* ویترین */
      featured: form.featured,
      pinnedTop: form.pinnedTop,
      excludeTop: form.excludeTop,

      /* میکس — سرور برای کالاهای غیرقهوه خودش پاک‌شان می‌کند */
      isBlend: form.kind === 'coffee' && form.isBlend,
      house: form.house,
      customizable: form.customizable,
      surcharge: Number(toLatinDigits(form.surcharge)) || 0,
      /* ترکیب ما فقط پیشنهاد است — بازهٔ مجاز و قفل نداریم،
         چون مشتری در انتخابش کاملاً آزاد است. */
      components: form.components.map((c) => ({
        slug: c.slug,
        percent: Number(toLatinDigits(c.percent)) || 0,
        min: 0,
        max: 100,
        locked: false
      })),
      pool: []
    };

    /* بررسی زودهنگام تا مدیر برای خطای ساده منتظر سرور نماند */
    if (payload.isBlend) {
      if (payload.components.length < 2) {
        return setError('یک میکس دست‌کم به دو دانه نیاز دارد');
      }
      const sum = payload.components.reduce((s, c) => s + c.percent, 0);
      if (Math.abs(sum - 100) > 1) {
        return setError(`مجموع درصدهای میکس باید ۱۰۰ باشد، الان ${sum} است`);
      }
    }

    setSaving(true);
    try {
      if (isNew) await api.createItem(payload);
      else await api.updateItem(id, payload);
      reloadShop();
      router.push('/admin/items');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="wrap admin-page">
        <p className="loading-note">در حال خواندن…</p>
      </div>
    );

  return (
    <div className="wrap admin-page">
      <div className="admin-head">
        <div>
          <p className="eyebrow">{isNew ? 'کالای تازه' : 'ویرایش کالا'}</p>
          <h1>{isNew ? `افزودن ${meta.label}` : form.name}</h1>
        </div>
        <Link className="admin-ghost" href="/admin/items">
          ← بازگشت به فهرست
        </Link>
      </div>

      <form className="form-split" onSubmit={save}>
        <div className="form-main">
          {/* ── نوع و دسته ── */}
          <fieldset className="form-card">
            <legend>نوع و دسته</legend>

            <label className="field">
              <span className="field-label">نوع کالا</span>
              <select
                className="select"
                value={form.kind}
                onChange={(e) => set('kind', e.target.value)}
                disabled={!isNew}
              >
                {KIND_ORDER.map((k) => (
                  <option key={k} value={k}>
                    {KINDS[k].label}
                  </option>
                ))}
              </select>
              <small className="hint">
                {isNew
                  ? 'قهوه و پودر به گرم فروخته می‌شوند، ابزار عددی.'
                  : 'نوع کالا بعد از ساخت عوض نمی‌شود.'}
              </small>
            </label>

            <label className="field">
              <span className="field-label">دسته</span>
              <select
                className="select"
                value={form.group}
                onChange={(e) => set('group', e.target.value)}
              >
                {meta.order.map((g) => (
                  <option key={g} value={g}>
                    {meta.groups[g].label}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

          {/* ── متن‌ها ── */}
          <fieldset className="form-card">
            <legend>معرفی کالا</legend>

            <label className="field">
              <span className="field-label">نام (روی کارت دیده می‌شود)</span>
              <input
                className="input"
                value={form.name}
                onChange={(e) => onName(e.target.value)}
                placeholder="مثلاً یرگاچف"
              />
            </label>

            <label className="field">
              <span className="field-label">شناسهٔ انگلیسی</span>
              <input
                className="input"
                dir="ltr"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set('slug', e.target.value);
                }}
                placeholder="yirgacheffe"
              />
              <small className="hint">
                فقط حروف کوچک انگلیسی، عدد و خط تیره. یکتاست و طرح تصویر خودکار از روی آن ساخته
                می‌شود.
              </small>
            </label>

            <label className="field">
              <span className="field-label">
                {form.kind === 'coffee' ? 'خاستگاه' : 'جنس یا خاستگاه'}
              </span>
              <input
                className="input"
                value={form.origin}
                onChange={(e) => set('origin', e.target.value)}
                placeholder="اتیوپی · گدئو"
              />
            </label>

            <label className="field">
              <span className="field-label">
                {form.kind === 'coffee' ? 'فرآوری و ارتفاع' : 'مشخصات فنی'}
              </span>
              <input
                className="input"
                value={form.spec}
                onChange={(e) => set('spec', e.target.value)}
                placeholder="فرآوری شسته · ارتفاع ۲۰۵۰ متر"
              />
            </label>

            <label className="field">
              <span className="field-label">ویژگی‌ها — هر خط یک مورد</span>
              <textarea
                className="input"
                rows="4"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder={'یاس\nلیموترش\nشکر قهوه‌ای'}
              />
            </label>

            {meta.pairsLabel ? (
              <label className="field">
                <span className="field-label">{meta.pairsLabel} — هر خط یک مورد</span>
                <textarea
                  className="input"
                  rows="3"
                  value={form.pairs}
                  onChange={(e) => set('pairs', e.target.value)}
                  placeholder={'وی۶۰\nکمکس'}
                />
              </label>
            ) : null}

            <label className="field">
              <span className="field-label">برچسب گوشهٔ تصویر (اختیاری)</span>
              <input
                className="input"
                value={form.tag}
                onChange={(e) => set('tag', e.target.value)}
                placeholder="پرفروش"
              />
            </label>
          </fieldset>

          {/* ── معرفی کامل ── */}
          <fieldset className="form-card">
            <legend>معرفی کامل (پنجرهٔ «دربارهٔ این کالا»)</legend>

            <p className="hint hint-block">
              هر کدام را خالی بگذارید، همان بخش در سایت نشان داده نمی‌شود. اگر هر سه خالی باشند،
              دکمهٔ «دربارهٔ این کالا» روی کارت نمی‌آید.
            </p>

            <label className="field">
              <span className="field-label">این کالا از کجا می‌آید</span>
              <textarea
                className="input"
                rows="4"
                value={form.story}
                onChange={(e) => set('story', e.target.value)}
                placeholder="داستان مزرعه، منطقه، ارتفاع و اینکه چرا این دانه را انتخاب کرده‌اید…"
              />
            </label>

            <label className="field">
              <span className="field-label">در فنجان چه می‌چشید</span>
              <textarea
                className="input"
                rows="4"
                value={form.taste}
                onChange={(e) => set('taste', e.target.value)}
                placeholder="عطر، اسیدیته، بدنه و ته‌مزه…"
              />
            </label>

            <label className="field">
              <span className="field-label">پیشنهاد ما برای دم کردن</span>
              <textarea
                className="input"
                rows="4"
                value={form.recommend}
                onChange={(e) => set('recommend', e.target.value)}
                placeholder="روش دم، دمای آب، آسیاب و نسبت…"
              />
            </label>

            {form.kind === 'coffee' ? (
              <div className="field">
                <span className="field-label">پروفایل طعمی</span>
                <small className="hint">
                  پایهٔ بخش «چه طعمی دوست دارید؟». هر قهوه می‌تواند چند برچسب داشته باشد.
                </small>
                <div className="tag-pick">
                  {TASTE_ORDER.map((t) => (
                    <button
                      type="button"
                      key={t}
                      className={`weight-btn ${form.tastes.includes(t) ? 'is-active' : ''}`.trim()}
                      onClick={() => toggleTaste(t)}
                    >
                      {TASTES[t]}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </fieldset>

          {/* ── میکس ── */}
          {form.kind === 'coffee' ? (
            <fieldset className="form-card">
              <legend>میکس</legend>

              <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.isBlend}
                  onChange={(e) => set('isBlend', e.target.checked)}
                />
                <span>این کالا از چند دانه ساخته شده است</span>
              </label>

              {form.isBlend ? (
                <>
                  <p className="hint hint-block">
                    قیمت میکس از میانگین وزنیِ قیمت دانه‌ها ساخته می‌شود، نه از فیلد «قیمت» بالا. آن
                    عدد فقط وقتی به کار می‌آید که دانه‌ای پیدا نشود.
                  </p>

                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={form.house}
                      onChange={(e) => set('house', e.target.checked)}
                    />
                    <span>میکس ویژهٔ خانه — در بخش جداگانهٔ «میکس‌های ویژه» بیاید</span>
                  </label>

                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={form.customizable}
                      onChange={(e) => set('customizable', e.target.checked)}
                    />
                    <span>مشتری بتواند نسبت دانه‌ها را خودش عوض کند و دانهٔ دلخواهش را بگذارد</span>
                  </label>

                  <div className="field">
                    <span className="field-label">ترکیب پیشنهادی ما</span>
                    <small className="hint">
                      مجموع درصدها باید ۱۰۰ شود. اگر «مشتری بتواند نسبت‌ها را عوض کند» روشن باشد،
                      این ترکیب فقط نقطهٔ شروع است: مشتری می‌تواند درصدها را از ۰ تا ۱۰۰ جابه‌جا
                      کند، دانه‌ای را بردارد، یا هر قهوهٔ دیگری از فهرست فروشگاه را جایش بگذارد.
                    </small>

                    {form.components.length === 0 ? (
                      <p className="hint hint-block">هنوز دانه‌ای اضافه نشده است.</p>
                    ) : (
                      <div className="mix-editor">
                        <div className="mix-editor-head">
                          <span>دانه</span>
                          <span>درصد</span>
                          <span></span>
                        </div>

                        {form.components.map((c, i) => (
                          <div className="mix-editor-row" key={i}>
                            <select
                              className="select"
                              value={c.slug}
                              onChange={(e) => setComponent(i, 'slug', e.target.value)}
                            >
                              {beans
                                .filter(
                                  (b) =>
                                    b.slug === c.slug ||
                                    !form.components.some((x) => x.slug === b.slug)
                                )
                                .filter((b) => b.slug !== form.slug)
                                .map((b) => (
                                  <option key={b.slug} value={b.slug}>
                                    {b.name}
                                    {b.active ? '' : ' (خاموش)'}
                                  </option>
                                ))}
                            </select>

                            <input
                              className="input"
                              dir="ltr"
                              inputMode="numeric"
                              value={c.percent}
                              onChange={(e) => setComponent(i, 'percent', e.target.value)}
                              aria-label="درصد"
                            />
                            <button
                              type="button"
                              className="admin-btn danger"
                              onClick={() => removeComponent(i)}
                            >
                              حذف
                            </button>
                          </div>
                        ))}

                        <p
                          className={`mix-editor-sum ${Math.abs(componentSum - 100) > 1 ? 'is-off' : ''}`.trim()}
                        >
                          مجموع: {toFa(componentSum)}٪
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      className="admin-btn"
                      onClick={addComponent}
                      disabled={freeBeans.length === 0}
                    >
                      + افزودن دانه
                    </button>
                  </div>

                  <label className="field">
                    <span className="field-label">دستمزد میکس کردن — به ازای هر کیلو (تومان)</span>
                    <input
                      className="input"
                      dir="ltr"
                      inputMode="numeric"
                      value={form.surcharge}
                      onChange={(e) => set('surcharge', e.target.value)}
                      placeholder="40000"
                    />
                    <small className="hint">به میانگین قیمت دانه‌ها اضافه می‌شود.</small>
                  </label>
                </>
              ) : null}
            </fieldset>
          ) : null}

          {/* ── ویترین ── */}
          <fieldset className="form-card">
            <legend>ویترین</legend>

            <label className="check-row">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => set('featured', e.target.checked)}
              />
              <span>در «پیشنهاد ما» بیاید — از میان همین‌ها پیشنهاد هر روز انتخاب می‌شود</span>
            </label>

            <label className="check-row">
              <input
                type="checkbox"
                checked={form.pinnedTop}
                onChange={(e) => set('pinnedTop', e.target.checked)}
              />
              <span>همیشه در «پرفروش‌ها» بالا بماند</span>
            </label>

            <label className="check-row">
              <input
                type="checkbox"
                checked={form.excludeTop}
                onChange={(e) => set('excludeTop', e.target.checked)}
              />
              <span>هیچ‌وقت در «پرفروش‌ها» نیاید</span>
            </label>

            <p className="hint hint-block">
              پرفروش‌ها از روی سفارش‌های واقعی ساخته می‌شوند؛ این دو کلید فقط استثناها را تعیین
              می‌کنند.
            </p>
          </fieldset>

          {/* ── قیمت و ترتیب ── */}
          <fieldset className="form-card">
            <legend>قیمت و ترتیب</legend>

            <label className="field">
              <span className="field-label">
                {meta.weighed ? 'قیمت هر کیلوگرم (تومان)' : 'قیمت هر عدد (تومان)'}
              </span>
              <input
                className="input"
                dir="ltr"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                placeholder="1850000"
                inputMode="numeric"
              />
              {Number(toLatinDigits(form.price)) > 0 ? (
                <small className="hint">{money(Number(toLatinDigits(form.price)))}</small>
              ) : null}
            </label>

            <label className="field">
              <span className="field-label">
                {meta.weighed ? 'موجودی انبار (گرم)' : 'موجودی انبار (عدد)'}
              </span>
              <input
                className="input"
                dir="ltr"
                value={form.stock}
                onChange={(e) => set('stock', e.target.value)}
                placeholder={meta.weighed ? '5000' : '12'}
                inputMode="numeric"
              />
              <small className="hint">
                خالی بگذارید تا نامحدود بماند — همان رفتار همیشگی. با گذاشتن عدد، هر سفارش از آن کم
                می‌شود و وقتی تمام شد، کالا در سایت «ناموجود» می‌خورد.
                {form.isBlend
                  ? ' برای میکس‌ها معمولاً خالی درست‌تر است: میکس از همان دانه‌ها ساخته می‌شود و موجودی جدایی ندارد.'
                  : ''}
              </small>
            </label>

            <label className="field">
              <span className="field-label">{meta.meterLabel} (۱ تا ۵)</span>
              <div className="meter-pick">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    className={`weight-btn ${Number(form.meter) === n ? 'is-active' : ''}`.trim()}
                    onClick={() => set('meter', n)}
                  >
                    {toFa(n)}
                  </button>
                ))}
              </div>
            </label>

            <label className="field">
              <span className="field-label">ترتیب نمایش</span>
              <input
                className="input"
                dir="ltr"
                value={form.rank}
                onChange={(e) => set('rank', e.target.value)}
                inputMode="numeric"
              />
              <small className="hint">عدد کوچک‌تر یعنی بالاتر در فهرست «پیشنهاد ما».</small>
            </label>

            <label className="check-row">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set('active', e.target.checked)}
              />
              <span>در سایت نمایش داده شود</span>
            </label>
          </fieldset>

          {/* ── تصویر ── */}
          <fieldset className="form-card">
            <legend>تصویر کارت</legend>

            <p className="hint hint-block">
              اگر عکسی آپلود نکنید، طرح خودکار همیشگی سایت کشیده می‌شود. با آپلود عکس، همان عکس جای
              طرح می‌نشیند. قالب‌های مجاز: JPG، PNG، WebP، AVIF و GIF.
            </p>

            <div className="upload-row">
              {/* فهرست صریح، نه image/* — سرور SVG را نمی‌پذیرد
                  و بهتر است انتخاب‌کنندهٔ فایل هم نشانش ندهد */}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                onChange={(e) => upload(e.target.files?.[0])}
                disabled={uploading}
              />
              {form.image ? (
                <button type="button" className="admin-btn danger" onClick={() => set('image', '')}>
                  برداشتن عکس
                </button>
              ) : null}
            </div>
            {uploading ? <p className="hint">در حال آپلود…</p> : null}

            {/* گزینه‌های طرح خودکار — وقتی عکس واقعی هست بی‌اثرند */}
            {!form.image && form.kind !== 'coffee' ? (
              <>
                <label className="field">
                  <span className="field-label">طرح</span>
                  <select
                    className="select"
                    value={form.shape}
                    onChange={(e) => set('shape', e.target.value)}
                  >
                    {Object.entries(form.kind === 'gear' ? GEAR_SHAPES : POWDER_SHAPES).map(
                      ([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      )
                    )}
                  </select>
                </label>

                {form.kind === 'gear' ? (
                  <>
                    <label className="field">
                      <span className="field-label">جنس (رنگ طرح)</span>
                      <select
                        className="select"
                        value={form.mat}
                        onChange={(e) => set('mat', e.target.value)}
                      >
                        {Object.entries(GEAR_MATERIALS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span className="field-label">بزرگ‌نمایی طرح</span>
                      <input
                        type="range"
                        className="range"
                        min="0.6"
                        max="1.4"
                        step="0.05"
                        value={form.zoom}
                        onChange={(e) => set('zoom', e.target.value)}
                      />
                      <small className="hint">{form.zoom}×</small>
                    </label>
                  </>
                ) : (
                  <label className="field">
                    <span className="field-label">رنگ پودر</span>
                    <select
                      className="select"
                      value={form.tone}
                      onChange={(e) => set('tone', e.target.value)}
                    >
                      {Object.entries(POWDER_TONES).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            ) : null}

            {!form.image && form.kind === 'coffee' ? (
              <p className="hint hint-block">
                تصویر قهوه از روی «دسته» و «درجهٔ رست» ساخته می‌شود — چیز دیگری لازم نیست.
              </p>
            ) : null}
          </fieldset>

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="form-actions">
            <button className="btn btn-primary" disabled={saving}>
              {saving ? 'در حال ذخیره…' : isNew ? 'افزودن کالا' : 'ذخیرهٔ تغییرات'}
            </button>
            <Link className="btn btn-ghost" href="/admin/items">
              انصراف
            </Link>
          </div>
        </div>

        {/* ── پیش‌نمایش زنده ── */}
        <aside className="form-preview">
          <div className="preview-sticky">
            <h2 className="preview-title">پیش‌نمایش کارت</h2>
            <p className="hint">دقیقاً همان چیزی که مشتری در سایت می‌بیند.</p>
            <div className="preview-box">
              <ItemCard item={preview} grams={meta.defaultWeight} onWeight={() => {}} />
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
