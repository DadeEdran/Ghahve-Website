'use client';

import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminSettings() {
  const { admin, refreshSession } = useAuth();

  const [form, setForm] = useState({
    newUsername: admin?.username || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setOkMsg('');

    if (!form.currentPassword) return setError('رمز فعلی را وارد کنید');
    if (form.newPassword.length < 6) return setError('رمز جدید دست‌کم ۶ نویسه باشد');
    if (form.newPassword !== form.confirmPassword) return setError('رمز جدید و تکرارش یکی نیستند');

    setBusy(true);
    try {
      const res = await api.changePassword({
        newUsername: form.newUsername.trim(),
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword
      });

      /* سرور توکن تازه می‌دهد تا از پنل بیرون نیفتیم */
      refreshSession(res.token, res.admin);
      setOkMsg(res.message);
      setForm((f) => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap admin-page">
      <div className="admin-head">
        <div>
          <p className="eyebrow">مدیریت فروشگاه</p>
          <h1>رمز عبور</h1>
          <p className="admin-sub">نام کاربری و رمز ورود به پنل را اینجا عوض کنید.</p>
        </div>
      </div>

      <form className="settings-form" onSubmit={submit}>
        <fieldset className="form-card">
          <legend>حساب مدیر</legend>

          <label className="field">
            <span className="field-label">نام کاربری</span>
            <input
              className="input"
              dir="ltr"
              value={form.newUsername}
              onChange={(e) => set('newUsername', e.target.value)}
              autoComplete="username"
            />
            <small className="hint">اگر نمی‌خواهید عوض شود، دست نزنید.</small>
          </label>

          <label className="field">
            <span className="field-label">رمز فعلی</span>
            <input
              className="input"
              dir="ltr"
              type={show ? 'text' : 'password'}
              value={form.currentPassword}
              onChange={(e) => set('currentPassword', e.target.value)}
              autoComplete="current-password"
            />
          </label>

          <label className="field">
            <span className="field-label">رمز جدید</span>
            <input
              className="input"
              dir="ltr"
              type={show ? 'text' : 'password'}
              value={form.newPassword}
              onChange={(e) => set('newPassword', e.target.value)}
              autoComplete="new-password"
            />
            <small className="hint">دست‌کم ۶ نویسه. ترکیب حرف و عدد امن‌تر است.</small>
          </label>

          <label className="field">
            <span className="field-label">تکرار رمز جدید</span>
            <input
              className="input"
              dir="ltr"
              type={show ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={(e) => set('confirmPassword', e.target.value)}
              autoComplete="new-password"
            />
          </label>

          <label className="check-row">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            <span>نمایش رمزها</span>
          </label>

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          {okMsg ? (
            <p className="form-ok" role="status">
              {okMsg}
            </p>
          ) : null}

          <div className="form-actions">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'در حال ذخیره…' : 'ذخیرهٔ رمز جدید'}
            </button>
          </div>
        </fieldset>

        <p className="hint hint-block">
          بعد از تغییر رمز، دستگاه‌های دیگری که با رمز قبلی وارد شده‌اند از پنل بیرون می‌آیند. همین
          مرورگر باز می‌ماند.
        </p>
      </form>
    </div>
  );
}
