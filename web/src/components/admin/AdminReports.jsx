'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { formatWeight, money, toFa, faDate } from '../../lib/format.js';
import { ORDER_STATUS, ORDER_STATUS_ORDER } from '../../lib/groups.js';
import OrderDetail from './OrderDetail.jsx';

/* ══════════════════════════════════════════════════
   گزارش فروش.

   بالا: خلاصهٔ روزانه / هفتگی / ماهانه / سالانه.
   وسط: هر بازه یک ردیف — با کلیک، فهرست پایین همان
   بازه را نشان می‌دهد.
   پایین: همهٔ سفارش‌ها؛ هر کدام باز می‌شود و همه‌چیزِ
   آن خرید را نشان می‌دهد.

   دکمه‌های خروجی همیشه «همان چیزی که الان می‌بینید» را
   می‌گیرند — بازه، وضعیت و جست‌وجو در فایل هم اعمال
   می‌شوند.
   ══════════════════════════════════════════════════ */

const PERIODS = [
  { key: 'day', label: 'روزانه', unit: 'روز', counts: [7, 14, 30, 90] },
  { key: 'week', label: 'هفتگی', unit: 'هفته', counts: [4, 8, 12, 26] },
  { key: 'month', label: 'ماهانه', unit: 'ماه', counts: [6, 12, 24, 36] },
  { key: 'year', label: 'سالانه', unit: 'سال', counts: [3, 5, 10] }
];

const STATUS_FILTERS = [
  { key: 'all', label: 'همه' },
  ...ORDER_STATUS_ORDER.map((k) => ({ key: k, label: ORDER_STATUS[k] }))
];

const PAGE_SIZE = 25;

export default function AdminReports() {
  const [period, setPeriod] = useState('month');
  const [count, setCount] = useState(12);

  const [summary, setSummary] = useState(null);
  const [sumLoading, setSumLoading] = useState(true);
  const [sumError, setSumError] = useState('');

  /* بازهٔ انتخاب‌شده — تهی یعنی «همهٔ زمان‌ها» */
  const [range, setRange] = useState(null);
  const [status, setStatus] = useState('all');
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const [list, setList] = useState({ orders: [], total: 0, pages: 1, topItems: [] });
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [open, setOpen] = useState(null); // سفارشِ باز در پنجره
  const [busy, setBusy] = useState(''); // نام فایلی که در حال ساخت است
  const [note, setNote] = useState('');
  const timer = useRef(null);

  /* جست‌وجو با کمی تأخیر تا با هر حرف یک درخواست نرود */
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setQuery(queryInput);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer.current);
  }, [queryInput]);

  /* با عوض شدن دورهٔ گزارش، تعداد بازه‌ها هم پیش‌فرض می‌شود */
  const changePeriod = (key) => {
    const p = PERIODS.find((x) => x.key === key);
    setPeriod(key);
    setCount(p.counts[Math.min(2, p.counts.length - 1)]);
    setRange(null);
    setPage(1);
  };

  const loadSummary = useCallback(async () => {
    setSumLoading(true);
    setSumError('');
    try {
      setSummary(await api.reportSummary(period, count));
    } catch (err) {
      setSumError(err.message);
    } finally {
      setSumLoading(false);
    }
  }, [period, count]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const params = useMemo(
    () => ({
      from: range?.from || '',
      to: range?.to || '',
      status,
      q: query
    }),
    [range, status, query]
  );

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      setList(await api.reportOrders({ ...params, page, limit: PAGE_SIZE }));
    } catch (err) {
      setListError(err.message);
    } finally {
      setListLoading(false);
    }
  }, [params, page]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  /* پنجرهٔ جزئیات: با Escape بسته می‌شود */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  /* فهرست ممکن است کهنه باشد — نسخهٔ قطعی را از سرور می‌گیریم */
  const openOrder = async (order) => {
    setOpen(order);
    try {
      const fresh = await api.order(order._id);
      setOpen((cur) => (cur && cur._id === fresh._id ? fresh : cur));
    } catch {
      /* همان نسخهٔ فهرست را نشان می‌دهیم */
    }
  };

  const changeStatus = async (order, next) => {
    try {
      const updated = await api.setOrderStatus(order._id, next);
      setList((prev) => ({
        ...prev,
        orders: prev.orders.map((o) =>
          o._id === updated._id ? { ...o, status: updated.status } : o
        )
      }));
      setOpen((cur) => (cur && cur._id === updated._id ? { ...cur, status: updated.status } : cur));
      loadSummary();
    } catch (err) {
      setListError(err.message);
    }
  };

  const grab = async (kind) => {
    setBusy(kind);
    setNote('');
    setListError('');
    try {
      if (kind === 'json') await api.reportJson(params);
      else await api.reportCsv({ ...params, mode: kind });
      setNote('فایل ساخته شد و در پوشهٔ «دانلودها» ذخیره شد.');
    } catch (err) {
      setListError(err.message);
    } finally {
      setBusy('');
    }
  };

  const buckets = summary?.buckets || [];
  const maxRevenue = Math.max(1, ...buckets.map((b) => b.revenue));
  const win = summary?.windowTotals;
  const all = summary?.allTime;
  const unit = PERIODS.find((p) => p.key === period).unit;
  const avg = win && win.orders ? Math.round(win.revenue / win.orders) : 0;

  return (
    <div className="wrap admin-page">
      <div className="admin-head">
        <div>
          <p className="eyebrow">مدیریت فروشگاه</p>
          <h1>گزارش‌ها</h1>
          <p className="admin-sub">
            {all ? (
              <>
                در مجموع {toFa(all.orders)} سفارش · {money(all.revenue)} فروش
                {all.canceled ? <> · {toFa(all.canceled)} لغو شده</> : null}
              </>
            ) : (
              'در حال خواندن…'
            )}
          </p>
        </div>
        <button
          className="admin-ghost"
          onClick={() => {
            loadSummary();
            loadList();
          }}
        >
          تازه‌سازی
        </button>
      </div>

      {/* ── دورهٔ گزارش ── */}
      <div className="toolbar">
        <div className="filters" role="group" aria-label="دورهٔ گزارش">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              className={`chip ${period === p.key ? 'is-active' : ''}`.trim()}
              onClick={() => changePeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <label className="range-pick">
          <span>آخرین</span>
          <select
            className="select"
            value={count}
            onChange={(e) => {
              setCount(Number(e.target.value));
              setRange(null);
              setPage(1);
            }}
          >
            {PERIODS.find((p) => p.key === period).counts.map((c) => (
              <option key={c} value={c}>
                {toFa(c)} {unit}
              </option>
            ))}
          </select>
        </label>
      </div>

      {sumError ? (
        <p className="form-error" role="alert">
          {sumError}
        </p>
      ) : null}

      {/* ── کارت‌های خلاصه ── */}
      {win ? (
        <div className="kpi-row">
          <Kpi label={`فروش ${toFa(count)} ${unit} اخیر`} value={money(win.revenue)} strong />
          <Kpi
            label="تعداد سفارش"
            value={toFa(win.orders)}
            hint={win.canceled ? `${toFa(win.canceled)} لغو شده` : ''}
          />
          <Kpi label="میانگین هر سفارش" value={avg ? money(avg) : '—'} />
          <Kpi
            label="قهوه و پودر فروخته‌شده"
            value={win.grams ? formatWeight(win.grams) : '—'}
            hint={win.pieces ? `${toFa(win.pieces)} قلم ابزار` : ''}
          />
        </div>
      ) : null}

      {/* ── جدول بازه‌ها ── */}
      <section className="report-block">
        <h2 className="report-h">
          فروش {PERIODS.find((p) => p.key === period).label}
          <small>روی هر ردیف بزنید تا سفارش‌های همان {unit} را ببینید</small>
        </h2>

        {sumLoading ? (
          <p className="loading-note">در حال خواندن…</p>
        ) : (
          <div className="table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>{unit}</th>
                  <th>سفارش</th>
                  <th>وزن</th>
                  <th>قلم</th>
                  <th>فروش</th>
                  <th className="col-bar">سهم</th>
                </tr>
              </thead>
              <tbody>
                {[...buckets].reverse().map((b) => {
                  const active = range?.from === b.from;
                  return (
                    <tr
                      key={b.key}
                      className={`report-row ${active ? 'is-active' : ''} ${b.orders ? '' : 'is-empty'}`.trim()}
                      onClick={() => {
                        setRange(active ? null : { from: b.from, to: b.to, label: b.label });
                        setPage(1);
                      }}
                      tabIndex={0}
                      role="button"
                      aria-pressed={active}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setRange(active ? null : { from: b.from, to: b.to, label: b.label });
                          setPage(1);
                        }
                      }}
                    >
                      <td className="col-label">
                        {b.label}
                        {b.canceled ? (
                          <em className="row-canceled">{toFa(b.canceled)} لغو</em>
                        ) : null}
                      </td>
                      <td>{b.orders ? toFa(b.orders) : '—'}</td>
                      <td>{b.grams ? formatWeight(b.grams) : '—'}</td>
                      <td>{b.pieces ? toFa(b.pieces) : '—'}</td>
                      <td className="col-money">{b.revenue ? money(b.revenue) : '—'}</td>
                      <td className="col-bar">
                        <span className="bar" aria-hidden="true">
                          <i
                            style={{ inlineSize: `${Math.round((b.revenue / maxRevenue) * 100)}%` }}
                          />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── سفارش‌ها ── */}
      <section className="report-block">
        <h2 className="report-h">
          سفارش‌ها
          <small>
            {range ? `بازه: ${range.label}` : 'همهٔ زمان‌ها'} · {toFa(list.total)} سفارش
          </small>
        </h2>

        <div className="toolbar">
          <div className="filters" role="group" aria-label="وضعیت سفارش">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s.key}
                className={`chip ${status === s.key ? 'is-active' : ''}`.trim()}
                onClick={() => {
                  setStatus(s.key);
                  setPage(1);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

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
              placeholder="شمارهٔ سفارش، نام، تلفن یا کالا"
              aria-label="جست‌وجوی سفارش"
            />
          </label>

          {range ? (
            <button
              className="admin-btn"
              onClick={() => {
                setRange(null);
                setPage(1);
              }}
            >
              برداشتن بازه ✕
            </button>
          ) : null}
        </div>

        {/* ── خروجی و پشتیبان ── */}
        <div className="backup-box">
          <div className="backup-text">
            <b>پشتیبان و خروجی</b>
            <p>
              فایل‌ها دقیقاً همان سفارش‌هایی را می‌گیرند که الان انتخاب کرده‌اید
              {range ? ` (${range.label})` : ' (همهٔ زمان‌ها)'}. برای پشتیبانِ واقعی، فایل JSON را
              نگه دارید: همه‌چیز بی‌کم‌وکاست در آن هست.
            </p>
          </div>
          <div className="backup-actions">
            <button
              className="admin-btn"
              onClick={() => grab('orders')}
              disabled={!!busy || list.total === 0}
            >
              {busy === 'orders' ? 'در حال ساخت…' : 'اکسل: یک ردیف هر سفارش ↓'}
            </button>
            <button
              className="admin-btn"
              onClick={() => grab('lines')}
              disabled={!!busy || list.total === 0}
            >
              {busy === 'lines' ? 'در حال ساخت…' : 'اکسل: ریز کالاها ↓'}
            </button>
            <button
              className="admin-btn primary"
              onClick={() => grab('json')}
              disabled={!!busy || list.total === 0}
            >
              {busy === 'json' ? 'در حال ساخت…' : 'پشتیبان کامل JSON ↓'}
            </button>
          </div>
        </div>

        {note ? (
          <p className="save-ok" role="status">
            {note}
          </p>
        ) : null}
        {listError ? (
          <p className="form-error" role="alert">
            {listError}
          </p>
        ) : null}

        {list.topItems?.length ? (
          <div className="top-items">
            <span className="top-items-label">پرفروش‌های این بازه:</span>
            {list.topItems.slice(0, 6).map((t) => (
              <span className="top-chip" key={t.slug}>
                {t.name}
                <b>{money(t.revenue)}</b>
              </span>
            ))}
          </div>
        ) : null}

        {listLoading ? (
          <p className="loading-note">در حال خواندن…</p>
        ) : list.orders.length === 0 ? (
          <p className="empty">با این فیلترها سفارشی پیدا نشد.</p>
        ) : (
          <>
            <div className="table-wrap">
              <table className="report-table orders-table">
                <thead>
                  <tr>
                    <th>شماره</th>
                    <th>تاریخ</th>
                    <th>مشتری</th>
                    <th>تلفن</th>
                    <th>کالاها</th>
                    <th>مبلغ</th>
                    <th>وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {list.orders.map((o) => (
                    <tr
                      key={o._id}
                      className="report-row"
                      onClick={() => openOrder(o)}
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openOrder(o);
                        }
                      }}
                    >
                      <td>
                        <b className="mono" dir="ltr">
                          {o.code}
                        </b>
                      </td>
                      <td>{faDate(o.createdAt)}</td>
                      <td>{o.customer?.name}</td>
                      <td className="cell-ltr" dir="ltr">
                        {o.customer?.phone}
                      </td>
                      <td className="col-items">{toFa(o.lines?.length || 0)} ردیف</td>
                      <td className="col-money">{money(o.totals?.total)}</td>
                      <td>
                        <span className={`order-badge is-${o.status}`}>
                          {ORDER_STATUS[o.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {list.pages > 1 ? (
              <div className="pager">
                <button
                  className="admin-btn"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1}
                >
                  تازه‌تر
                </button>
                <span className="pager-info">
                  صفحهٔ {toFa(page)} از {toFa(list.pages)}
                </span>
                <button
                  className="admin-btn"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= list.pages}
                >
                  قدیمی‌تر
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {open ? (
        <OrderModal order={open} onClose={() => setOpen(null)} onStatus={changeStatus} />
      ) : null}
    </div>
  );
}

/* ── کارت خلاصه ── */
function Kpi({ label, value, hint, strong }) {
  return (
    <div className={`kpi ${strong ? 'is-strong' : ''}`.trim()}>
      <span className="kpi-label">{label}</span>
      <b className="kpi-value">{value}</b>
      {hint ? <small className="kpi-hint">{hint}</small> : null}
    </div>
  );
}

/* ── پنجرهٔ جزئیات یک سفارش ── */
function OrderModal({ order, onClose, onStatus }) {
  const o = order;

  return (
    <div className="modal-back" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={`سفارش ${o.code}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">سفارش</p>
            <h2 className="mono" dir="ltr">
              {o.code}
            </h2>
            <p className="admin-sub">{faDate(o.createdAt)}</p>
          </div>
          <span className={`order-badge is-${o.status}`}>{ORDER_STATUS[o.status]}</span>
          <button className="modal-x" onClick={onClose} aria-label="بستن">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <OrderDetail order={o} />

          <div className="order-actions">
            <span className="order-actions-label">تغییر وضعیت:</span>
            {ORDER_STATUS_ORDER.map((k) => (
              <button
                key={k}
                className={`admin-btn ${o.status === k ? 'is-current' : ''}`.trim()}
                onClick={() => onStatus(o, k)}
                disabled={o.status === k}
              >
                {ORDER_STATUS[k]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
