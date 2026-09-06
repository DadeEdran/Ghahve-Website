'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { formatWeight, money, toFa, faDate } from '../../lib/format.js';
import { ORDER_STATUS, ORDER_STATUS_ORDER } from '../../lib/groups.js';
import OrderDetail from './OrderDetail.jsx';

const STATUSES = [
  { key: 'all', label: 'همه' },
  ...ORDER_STATUS_ORDER.map((k) => ({ key: k, label: ORDER_STATUS[k] }))
];

const STATUS_LABEL = ORDER_STATUS;

export default function AdminOrders() {
  const [status, setStatus] = useState('all');
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { orders: list, counts: c } = await api.orders(status);
      setOrders(list);
      setCounts(c);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (order, next) => {
    try {
      const updated = await api.setOrderStatus(order._id, next);
      setOrders((prev) => prev.map((o) => (o._id === order._id ? updated : o)));
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (order) => {
    try {
      await api.deleteOrder(order._id);
      setOrders((prev) => prev.filter((o) => o._id !== order._id));
      setConfirmId(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="wrap admin-page">
      <div className="admin-head">
        <div>
          <p className="eyebrow">مدیریت فروشگاه</p>
          <h1>سفارش‌ها</h1>
          <p className="admin-sub">
            {toFa(total)} سفارش · {toFa(counts.new || 0)} تازه
          </p>
        </div>
        <button className="admin-ghost" onClick={load}>
          تازه‌سازی
        </button>
      </div>

      <div className="toolbar">
        <div className="filters" role="group" aria-label="وضعیت سفارش">
          {STATUSES.map((s) => (
            <button
              key={s.key}
              className={`chip ${status === s.key ? 'is-active' : ''}`.trim()}
              onClick={() => setStatus(s.key)}
            >
              {s.label}
              {s.key !== 'all' && counts[s.key] ? <b>{toFa(counts[s.key])}</b> : null}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="loading-note">در حال خواندن…</p>
      ) : orders.length === 0 ? (
        <p className="empty">سفارشی با این وضعیت ثبت نشده است.</p>
      ) : (
        <div className="order-list">
          {orders.map((o) => {
            const open = openId === o._id;
            return (
              <article className={`order-card status-${o.status}`} key={o._id}>
                <button
                  className="order-top"
                  onClick={() => setOpenId(open ? null : o._id)}
                  aria-expanded={open}
                >
                  <span className="order-id">
                    <b dir="ltr">{o.code}</b>
                    <small>{faDate(o.createdAt)}</small>
                  </span>

                  <span className="order-who">
                    <b>{o.customer.name}</b>
                    <small dir="ltr">{o.customer.phone}</small>
                  </span>

                  <span className="order-sum">
                    {o.totals.grams ? formatWeight(o.totals.grams) : ''}
                    {o.totals.grams && o.totals.pieces ? ' + ' : ''}
                    {o.totals.pieces ? `${toFa(o.totals.pieces)} قلم` : ''}
                  </span>

                  <span className="order-total">{money(o.totals.total)}</span>

                  <span className={`order-badge is-${o.status}`}>{STATUS_LABEL[o.status]}</span>
                  <span className="order-caret" aria-hidden="true">
                    {open ? '▲' : '▼'}
                  </span>
                </button>

                {open ? (
                  <div className="order-detail">
                    <OrderDetail order={o} />

                    <div className="order-actions">
                      <span className="order-actions-label">تغییر وضعیت:</span>
                      {Object.entries(STATUS_LABEL).map(([k, label]) => (
                        <button
                          key={k}
                          className={`admin-btn ${o.status === k ? 'is-current' : ''}`.trim()}
                          onClick={() => changeStatus(o, k)}
                          disabled={o.status === k}
                        >
                          {label}
                        </button>
                      ))}

                      {confirmId === o._id ? (
                        <span className="confirm">
                          <button className="admin-btn danger" onClick={() => remove(o)}>
                            حذف قطعی
                          </button>
                          <button className="admin-btn" onClick={() => setConfirmId(null)}>
                            انصراف
                          </button>
                        </span>
                      ) : (
                        <button className="admin-btn danger" onClick={() => setConfirmId(o._id)}>
                          حذف سفارش
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
