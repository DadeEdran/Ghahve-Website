'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext.jsx';
import { ShopProvider } from '../../context/ShopContext.jsx';

const NAV = [
  {
    to: '/admin/items',
    label: 'کالاها',
    icon: (
      <path
        d="M4 7h16M4 12h16M4 17h10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    )
  },
  {
    to: '/admin/orders',
    label: 'سفارش‌ها',
    icon: (
      <>
        <path
          d="M4 6h16l-1.5 11.5a2 2 0 0 1-2 1.5H7.5a2 2 0 0 1-2-1.5L4 6Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      </>
    )
  },
  {
    to: '/admin/reports',
    label: 'گزارش‌ها',
    icon: (
      <>
        <path
          d="M4 19.5V4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M4 19.5h16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M8 16.5v-5M12.5 16.5v-9M17 16.5v-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      </>
    )
  },
  {
    to: '/admin/content',
    label: 'محتوای سایت',
    icon: (
      <>
        <rect
          x="4"
          y="4.5"
          width="16"
          height="15"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M8 9h8M8 12.5h8M8 16h5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </>
    )
  },
  {
    to: '/admin/club',
    label: 'باشگاه',
    icon: (
      <>
        <circle cx="9" cy="9" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M16 6.2a3 3 0 0 1 0 5.6M17.5 19a5.6 5.6 0 0 0-2-4.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </>
    )
  },
  {
    to: '/admin/settings',
    label: 'رمز عبور',
    icon: (
      <>
        <rect
          x="5"
          y="10.5"
          width="14"
          height="9"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
      </>
    )
  }
];

export default function AdminShell({ children }) {
  const { admin, checking, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  /* ── دروازهٔ ورود ──
     در نسخهٔ ویت این یک <Navigate replace /> بود. App
     Router چنین کامپوننتی ندارد و هدایت نباید در رندر
     انجام شود، پس در افکت است. تا رفتن، همان پیام
     «بررسی نشست» دیده می‌شود — نه پنلی که یک لحظه
     برق بزند و بعد برود. */
  useEffect(() => {
    if (!checking && !admin) router.replace('/admin/login');
  }, [checking, admin, router]);

  if (checking || !admin) return <div className="admin-boot">در حال بررسی نشست…</div>;

  const signOut = () => {
    logout();
    router.replace('/admin/login');
  };

  return (
    <div className="admin">
      <header className="admin-bar">
        <div className="admin-bar-inner">
          <Link className="logo" href="/admin/items">
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
          </Link>

          <nav className={`admin-nav ${menuOpen ? 'is-open' : ''}`.trim()}>
            {NAV.map((n) => (
              <Link
                key={n.to}
                href={n.to}
                /* NavLink در react-router خودش می‌دانست کدام
                   مسیر فعال است. اینجا با مسیر جاری سنجیده
                   می‌شود، و startsWith لازم است چون فرم کالا
                   (/admin/items/new و /admin/items/:id)
                   زیرمسیرِ «کالاها» است و باید همان دکمه را
                   فعال نشان بدهد — دقیقاً همان کاری که
                   NavLink پیش‌فرض می‌کرد. */
                className={`admin-link ${
                  pathname === n.to || pathname.startsWith(`${n.to}/`) ? 'is-active' : ''
                }`.trim()}
                onClick={() => setMenuOpen(false)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {n.icon}
                </svg>
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="admin-bar-actions">
            <a className="admin-ghost" href="/" target="_blank" rel="noreferrer">
              دیدن سایت ↗
            </a>
            <span className="admin-user">{admin.username}</span>
            <button className="admin-ghost" onClick={signOut}>
              خروج
            </button>
            <button
              className="btn-burger"
              aria-label="باز و بسته کردن منو"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </header>

      {/* ── چرا پنل هم ShopProvider دارد ──
          فرم کالا کنار خودش پیش‌نمایش زندهٔ کارت فروشگاه را
          نشان می‌دهد، و آن کارت همان ItemCard واقعی است —
          پس همان کانتکست را می‌خواهد. loadOnMount یعنی
          فهرست را خودش در مرورگر بگیرد، چون صفحه‌های پنل
          سروری نیستند که کسی برایشان آماده کند. دلیل کامل
          پای همان پارامتر در ShopContext است.

          فقط دور محتوا می‌پیچد، نه دور نوار بالا: نوار به
          فهرست کالاها کاری ندارد. */}
      <main className="admin-main">
        <ShopProvider loadOnMount>{children}</ShopProvider>
      </main>
    </div>
  );
}
