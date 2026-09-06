'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminLogin() {
  const { admin, checking, login } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  /* ── هدایتِ نشستِ باز ──
     در نسخهٔ ویت این یک <Navigate replace /> بود که همان
     موقع رندر جابه‌جا می‌کرد. App Router چنین کامپوننتی
     ندارد و هدایت باید بیرون از رندر انجام شود — پس در
     یک افکت. تا رفتنش، همان پیام «بررسی نشست» دیده
     می‌شود، نه یک فرم ورودِ بی‌فایده. */
  useEffect(() => {
    if (admin) router.replace('/admin/items');
  }, [admin, router]);

  if (checking || admin) return <div className="admin-boot">در حال بررسی نشست…</div>;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username.trim(), password);
      router.replace('/admin/items');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <svg className="logo-mark" viewBox="0 0 40 40" aria-hidden="true">
            <path
              d="M20 6c6 0 9 4 9 9s-4 6-4 10a5 5 0 0 1-10 0c0-4-4-5-4-10s3-9 9-9Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path d="M20 8v20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 33h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="logo-text">
            رُست‌خانهٔ دانه<em>پنل مدیریت</em>
          </span>
        </div>

        <h1>ورود مدیر</h1>
        <p className="login-note">برای مدیریت کالاها، تصویرها و سفارش‌ها وارد شوید.</p>

        <label className="field">
          <span className="field-label">نام کاربری</span>
          <input
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            dir="ltr"
          />
        </label>

        <label className="field">
          <span className="field-label">رمز عبور</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            dir="ltr"
          />
        </label>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'در حال ورود…' : 'ورود به پنل'}
        </button>

        <Link className="login-back" href="/">
          ← بازگشت به فروشگاه
        </Link>
      </form>
    </div>
  );
}
