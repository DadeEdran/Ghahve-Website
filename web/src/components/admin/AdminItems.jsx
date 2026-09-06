'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api.js';
import { KINDS, KIND_ORDER, isTracked, isSoldOut, stockText } from '../../lib/groups.js';
import { money, toFa } from '../../lib/format.js';
import CardArt from '../../components/CardArt.jsx';
import { useStorefrontRefresh } from '../../lib/useStorefrontRefresh.js';

export default function AdminItems() {
  const reloadShop = useStorefrontRefresh();

  const [kind, setKind] = useState('coffee');
  const [group, setGroup] = useState('all');
  const [sort, setSort] = useState('rank');
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const timer = useRef(null);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setQuery(queryInput), 250);
    return () => clearTimeout(timer.current);
  }, [queryInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await api.adminItems({ kind, q: query }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [kind, query]);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3000);
  };

  const toggle = async (item) => {
    setBusyId(item._id);
    try {
      const updated = await api.toggleItem(item._id);
      setItems((prev) => prev.map((i) => (i._id === item._id ? updated : i)));
      reloadShop();
      flash(
        updated.active
          ? `«${updated.name}» در سایت نمایش داده می‌شود`
          : `«${updated.name}» از سایت پنهان شد`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item) => {
    setBusyId(item._id);
    try {
      await api.deleteItem(item._id);
      setItems((prev) => prev.filter((i) => i._id !== item._id));
      setConfirmId(null);
      reloadShop();
      flash(`«${item.name}» حذف شد`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const meta = KINDS[kind];

  /* با عوض شدن نوع کالا، دسته‌ها هم فرق می‌کنند؛
     پس فیلتر دسته به «همه» برمی‌گردد. */
  const pickKind = (k) => {
    setKind(k);
    setGroup('all');
    setConfirmId(null);
  };

  const stats = useMemo(
    () => ({
      total: items.length,
      off: items.filter((i) => !i.active).length,
      withPhoto: items.filter((i) => i.image).length,
      out: items.filter(isSoldOut).length
    }),
    [items]
  );

  /* شمارهٔ کنار هر دکمهٔ دسته — روی همهٔ کالاهای همین نوع
     حساب می‌شود تا با انتخاب یک دسته، بقیه صفر نشوند. */
  const counts = useMemo(() => {
    const map = {};
    for (const it of items) map[it.group] = (map[it.group] || 0) + 1;
    return map;
  }, [items]);

  /* فیلتر دسته و ترتیب نمایش — هر دو سمت مرورگر انجام
     می‌شوند؛ فهرست کالاها کوچک است و رفت‌وبرگشت لازم ندارد. */
  const visible = useMemo(() => {
    const list = items.filter((i) => group === 'all' || i.group === group);

    /* جدول مرتب‌سازی — نام‌ها زیر هم */
    // prettier-ignore
    const by = {
      rank:         (a, b) => a.rank - b.rank || a.name.localeCompare(b.name, 'fa'),
      name:         (a, b) => a.name.localeCompare(b.name, 'fa'),
      'price-asc':  (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      'meter-asc':  (a, b) => a.meter - b.meter || a.rank - b.rank,
      'meter-desc': (a, b) => b.meter - a.meter || a.rank - b.rank,
      'off-first':  (a, b) => Number(a.active) - Number(b.active) || a.rank - b.rank
    };
    return [...list].sort(by[sort] || by.rank);
  }, [items, group, sort]);

  return (
    <div className="wrap admin-page">
      <div className="admin-head">
        <div>
          <p className="eyebrow">مدیریت فروشگاه</p>
          <h1>کالاها</h1>
          <p className="admin-sub">
            {toFa(stats.total)} {meta.label} · {toFa(stats.off)} مورد پنهان ·{' '}
            {toFa(stats.withPhoto)} مورد با عکس واقعی
            {stats.out ? ` · ${toFa(stats.out)} مورد ناموجود` : ''}
          </p>
        </div>
        <Link className="btn btn-primary" href={`/admin/items/new?kind=${kind}`}>
          + افزودن {meta.label} تازه
        </Link>
      </div>

      <div className="toolbar">
        <div className="filters" role="group" aria-label="نوع کالا">
          {KIND_ORDER.map((k) => (
            <button
              key={k}
              className={`chip ${kind === k ? 'is-active' : ''}`.trim()}
              onClick={() => pickKind(k)}
            >
              {KINDS[k].label}
            </button>
          ))}
        </div>

        <div className="tools">
          <label className="search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="m16 16 4.5 4.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="search"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="جست‌وجو در نام، شناسه یا خاستگاه…"
              aria-label="جست‌وجو در کالاها"
            />
          </label>

          <label className="sortbox">
            <span>ترتیب</span>
            <select
              className="select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="ترتیب نمایش کالاها"
            >
              <option value="rank">چیدمان سایت</option>
              <option value="name">حروف الفبا</option>
              <option value="price-asc">ارزان‌ترین</option>
              <option value="price-desc">گران‌ترین</option>
              <option value="meter-asc">{meta.sortLow}</option>
              <option value="meter-desc">{meta.sortHigh}</option>
              <option value="off-first">پنهان‌ها اول</option>
            </select>
          </label>

          <span className="result-count">
            {visible.length ? `${toFa(visible.length)} ${meta.label}` : 'بدون نتیجه'}
          </span>
        </div>

        <div className="subfilters" role="group" aria-label="دستهٔ کالا">
          <span className="subfilters-label">دسته</span>
          <button
            className={`chip chip-sm ${group === 'all' ? 'is-active' : ''}`.trim()}
            onClick={() => setGroup('all')}
          >
            همه <b>{toFa(items.length)}</b>
          </button>
          {meta.order.map((g) => (
            <button
              key={g}
              className={`chip chip-sm ${group === g ? 'is-active' : ''}`.trim()}
              onClick={() => setGroup(g)}
            >
              {meta.groups[g].label} <b>{toFa(counts[g] || 0)}</b>
            </button>
          ))}
        </div>
      </div>

      {notice ? (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="loading-note">در حال خواندن…</p>
      ) : visible.length === 0 ? (
        <p className="empty">
          {query
            ? 'با این جست‌وجو کالایی پیدا نشد.'
            : group !== 'all'
              ? `در دستهٔ «${meta.groups[group]?.label || group}» هنوز کالایی نیست.`
              : `هنوز ${meta.label}ای اضافه نکرده‌اید.`}
        </p>
      ) : (
        <div className="admin-table" role="table">
          <div className="admin-row admin-row-head" role="row">
            <span>تصویر</span>
            <span>نام و شناسه</span>
            <span>دسته</span>
            <span>{meta.weighed ? 'قیمت هر کیلو' : 'قیمت هر عدد'}</span>
            <span>موجودی</span>
            <span>وضعیت</span>
            <span className="admin-actions-head">کارها</span>
          </div>

          {visible.map((item) => (
            <div
              className={`admin-row ${item.active ? '' : 'is-off'}`.trim()}
              key={item._id}
              role="row"
            >
              <span className="admin-thumb">
                <CardArt item={item} slot="thumb" />
              </span>

              <span className="admin-name">
                <b>{item.name}</b>
                <small dir="ltr">{item.slug}</small>
                {item.tag ? <em className="admin-tag">{item.tag}</em> : null}
              </span>

              <span className="admin-cell">{meta.groups[item.group]?.label || item.group}</span>

              <span className="admin-cell admin-price">{money(item.price)}</span>

              {/* موجودی — «نامحدود» یعنی مدیر اصلاً نشمرده است */}
              <span
                className={`admin-cell admin-stock${
                  isSoldOut(item) ? ' is-out' : isTracked(item) ? '' : ' is-free'
                }`}
              >
                {stockText(item)}
              </span>

              <span className="admin-cell">
                <button
                  className={`switch ${item.active ? 'is-on' : ''}`.trim()}
                  onClick={() => toggle(item)}
                  disabled={busyId === item._id}
                  aria-label={item.active ? 'پنهان کردن از سایت' : 'نمایش در سایت'}
                >
                  <i />
                  <span>{item.active ? 'در سایت' : 'پنهان'}</span>
                </button>
              </span>

              <span className="admin-actions">
                <Link className="admin-btn" href={`/admin/items/${item._id}`}>
                  ویرایش
                </Link>

                {confirmId === item._id ? (
                  <span className="confirm">
                    <button
                      className="admin-btn danger"
                      onClick={() => remove(item)}
                      disabled={busyId === item._id}
                    >
                      {busyId === item._id ? '…' : 'حذف قطعی'}
                    </button>
                    <button className="admin-btn" onClick={() => setConfirmId(null)}>
                      انصراف
                    </button>
                  </span>
                ) : (
                  <button className="admin-btn danger" onClick={() => setConfirmId(item._id)}>
                    حذف
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
