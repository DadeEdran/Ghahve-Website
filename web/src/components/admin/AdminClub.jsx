'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { TASTES } from '../../lib/groups.js';
import { faDate, toFa } from '../../lib/format.js';

/* ══════════════════════════════════════════════════
   اعضای باشگاه مشتریان.
   فهرست، جست‌وجو، حذف و خروجی CSV برای پیامک انبوه.
   ══════════════════════════════════════════════════ */

export default function AdminClub() {
  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const timer = useRef(null);

  /* جست‌وجو با کمی تأخیر تا با هر حرف یک درخواست نرود */
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setQuery(queryInput), 200);
    return () => clearTimeout(timer.current);
  }, [queryInput]);

  const load = async (q) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.clubMembers(q);
      setMembers(res.members || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(query);
  }, [query]);

  const remove = async (id) => {
    try {
      await api.deleteClubMember(id);
      setMembers((prev) => prev.filter((m) => m._id !== id));
      setTotal((n) => Math.max(0, n - 1));
      setConfirmId(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const download = async () => {
    setError('');
    try {
      await api.clubCsv();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="wrap admin-page">
      <div className="admin-head">
        <div>
          <p className="eyebrow">باشگاه مشتریان</p>
          <h1>
            اعضا <span className="count-pill">{toFa(total)}</span>
          </h1>
        </div>
        <button className="admin-ghost" onClick={download} disabled={total === 0}>
          گرفتن خروجی CSV ↓
        </button>
      </div>

      <p className="hint hint-block">
        این فهرست از فرم «باشگاه مشتریان» در صفحهٔ اصلی پر می‌شود. خروجی CSV را می‌توانید مستقیم به
        سامانهٔ پیامک یا خبرنامه بدهید.
      </p>

      <div className="toolbar">
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
            placeholder="جست‌وجو در نام، شماره یا ایمیل"
            aria-label="جست‌وجوی اعضا"
          />
        </label>
      </div>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="loading-note">در حال خواندن…</p>
      ) : members.length === 0 ? (
        <p className="empty">
          {query ? 'با این جست‌وجو عضوی پیدا نشد.' : 'هنوز کسی در باشگاه عضو نشده است.'}
        </p>
      ) : (
        <div className="table-wrap">
          <table className="club-table">
            <thead>
              <tr>
                <th>نام</th>
                <th>موبایل</th>
                <th>ایمیل</th>
                <th>سلیقه</th>
                <th>تاریخ عضویت</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m._id}>
                  <td>{m.name}</td>
                  <td dir="ltr" className="cell-ltr">
                    {m.phone}
                  </td>
                  <td dir="ltr" className="cell-ltr">
                    {m.email || '—'}
                  </td>
                  <td>{m.taste ? TASTES[m.taste] || m.taste : '—'}</td>
                  <td>{faDate(m.createdAt)}</td>
                  <td className="cell-actions">
                    {confirmId === m._id ? (
                      <>
                        <button className="admin-btn danger" onClick={() => remove(m._id)}>
                          حذف شود
                        </button>
                        <button className="admin-btn" onClick={() => setConfirmId(null)}>
                          انصراف
                        </button>
                      </>
                    ) : (
                      <button className="admin-btn" onClick={() => setConfirmId(m._id)}>
                        حذف
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
