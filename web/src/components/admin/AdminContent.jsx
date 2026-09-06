'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useStorefrontRefresh } from '../../lib/useStorefrontRefresh.js';
import { CONTENT_SCHEMA } from './contentSchema.js';

/* ══════════════════════════════════════════════════
   ویرایش متن‌های سایت.

   فرم از روی توصیف بخش‌ها (contentSchema.js) ساخته
   می‌شود، پس هر بخش تازه‌ای که به سایت اضافه شود
   خودبه‌خود اینجا هم قابل ویرایش می‌شود.

   هر بخش جدا ذخیره می‌شود تا اگر وسط کار پشیمان شدید،
   بقیه دست‌نخورده بمانند.
   ══════════════════════════════════════════════════ */

/* ---------- یک فیلد ---------- */
function Field({ def, value, onChange }) {
  const common = { className: 'input', value: value ?? '' };

  if (def.type === 'check') {
    return (
      <label className="check-row">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{def.label}</span>
      </label>
    );
  }

  return (
    <label className="field">
      <span className="field-label">{def.label}</span>

      {def.type === 'textarea' ? (
        <textarea {...common} rows="4" onChange={(e) => onChange(e.target.value)} />
      ) : def.type === 'select' ? (
        <select className="select" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {def.options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      ) : def.type === 'lines' ? (
        <textarea
          className="input"
          rows="4"
          value={Array.isArray(value) ? value.join('\n') : ''}
          onChange={(e) =>
            onChange(
              e.target.value
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
        />
      ) : (
        <input {...common} onChange={(e) => onChange(e.target.value)} />
      )}

      {def.hint ? <small className="hint">{def.hint}</small> : null}
    </label>
  );
}

/* ---------- فهرست موردهای چندفیلدی ---------- */
function ListField({ def, value, onChange }) {
  const rows = Array.isArray(value) ? value : [];

  const setRow = (i, key, v) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)));

  const add = () => {
    const blank = {};
    for (const f of def.item) {
      blank[f.key] =
        f.type === 'lines'
          ? []
          : f.type === 'check'
            ? false
            : f.type === 'select'
              ? f.options[0][0]
              : '';
    }
    onChange([...rows, blank]);
  };

  const remove = (i) => onChange(rows.filter((_, idx) => idx !== i));

  /* جابه‌جایی بالا و پایین — ترتیب همان‌طور که اینجاست در سایت دیده می‌شود */
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="field">
      <span className="field-label">{def.label}</span>

      {rows.length === 0 ? <p className="hint hint-block">هنوز موردی اضافه نشده است.</p> : null}

      {rows.map((row, i) => (
        <div className="list-item" key={i}>
          <div className="list-item-bar">
            <b>
              {def.itemLabel || 'مورد'} {i + 1}
            </b>
            <div className="list-item-tools">
              <button
                type="button"
                className="admin-btn"
                onClick={() => move(i, -1)}
                disabled={i === 0}
              >
                ↑
              </button>
              <button
                type="button"
                className="admin-btn"
                onClick={() => move(i, 1)}
                disabled={i === rows.length - 1}
              >
                ↓
              </button>
              <button type="button" className="admin-btn danger" onClick={() => remove(i)}>
                حذف
              </button>
            </div>
          </div>

          {def.item.map((f) => (
            <Field key={f.key} def={f} value={row[f.key]} onChange={(v) => setRow(i, f.key, v)} />
          ))}
        </div>
      ))}

      <button type="button" className="admin-btn" onClick={add}>
        + افزودن {def.itemLabel || 'مورد'}
      </button>
    </div>
  );
}

/* ---------- یک بخش کامل ---------- */
function Section({ def, data, onSaved }) {
  const [draft, setDraft] = useState(data || {});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  /* اگر بعد از بازنشانی دادهٔ تازه رسید، فرم هم تازه شود */
  useEffect(() => {
    setDraft(data || {});
  }, [data]);

  const set = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setMsg('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setMsg('');
    try {
      await api.saveContent(def.key, draft);
      setMsg('ذخیره شد');
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm(`«${def.label}» به متن اولیه برگردد؟ نوشته‌های خودتان از بین می‌رود.`))
      return;
    setSaving(true);
    setError('');
    try {
      const res = await api.resetContent(def.key);
      setDraft(res.data || {});
      setMsg('به حالت اولیه برگشت');
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="form-card content-card">
      <button
        type="button"
        className="content-head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>
          <b>{def.label}</b>
          {def.note ? <em>{def.note}</em> : null}
        </span>
        <span className="content-toggle">{open ? '−' : '+'}</span>
      </button>

      {open ? (
        <div className="content-body">
          {def.fields.map((f) =>
            f.type === 'list' ? (
              <ListField key={f.key} def={f} value={draft[f.key]} onChange={(v) => set(f.key, v)} />
            ) : (
              <Field key={f.key} def={f} value={draft[f.key]} onChange={(v) => set(f.key, v)} />
            )
          )}

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="form-actions">
            <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'در حال ذخیره…' : 'ذخیرهٔ این بخش'}
            </button>
            <button type="button" className="admin-btn danger" onClick={reset} disabled={saving}>
              بازگشت به متن اولیه
            </button>
            {msg ? <span className="save-ok">{msg}</span> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* ---------- صفحه ---------- */
export default function AdminContent() {
  const reloadShop = useStorefrontRefresh();
  const [content, setContent] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setContent(await api.content());
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* بعد از هر ذخیره، فروشگاه هم متن تازه را می‌خواند */
  const onSaved = () => {
    load();
    reloadShop();
  };

  if (error)
    return (
      <div className="wrap admin-page">
        <p className="form-error">{error}</p>
      </div>
    );
  if (!content)
    return (
      <div className="wrap admin-page">
        <p className="loading-note">در حال خواندن…</p>
      </div>
    );

  return (
    <div className="wrap admin-page">
      <div className="admin-head">
        <div>
          <p className="eyebrow">محتوای سایت</p>
          <h1>متن‌های صفحهٔ اصلی</h1>
        </div>
        <a className="admin-ghost" href="/" target="_blank" rel="noreferrer">
          دیدن سایت ↗
        </a>
      </div>

      <p className="hint hint-block">
        روی نام هر بخش بزنید تا باز شود. هر بخش دکمهٔ ذخیرهٔ خودش را دارد و بلافاصله در سایت دیده
        می‌شود.
      </p>

      <div className="content-list">
        {CONTENT_SCHEMA.map((def) => (
          <Section key={def.key} def={def} data={content[def.key]} onSaved={onSaved} />
        ))}
      </div>
    </div>
  );
}
